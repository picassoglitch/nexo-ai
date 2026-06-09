// NexoClip integration — talks to NexoClip's FastAPI backend.
//
// REQUIRED ENV VARS:
//   NEXOCLIP_ADMIN_TOKEN  Bearer token NexoClip's /api/admin endpoints accept.
//                          NEVER expose to clients. Set in .env.local + Vercel.
//   NEXOCLIP_SSO_SECRET   HMAC secret shared with NexoClip — used to sign the
//                          launch token. Match NexoClip's NEXO_AI_SSO_SECRET.
//
// CONTRACT (what NexoClip must expose — see docs/nexo_ai_integration.md
// when you implement this on the NexoClip side):
//
//   POST {admin_api_base}/tenants
//     Headers:  Authorization: Bearer <NEXOCLIP_ADMIN_TOKEN>
//     Body:     { external_user_id, email, display_name }
//     Returns:  { tenant_id, api_token }      (200)
//               { error: 'duplicate', tenant_id, api_token }  (409 — already exists)
//
//   GET {external_url}/auth/sso?token=<signed>&next=<path>
//     Engine validates HMAC, sets session cookie, then redirects to `next`
//     (a relative, same-origin path — NexoClip must reject absolute/off-origin
//     values). We always send next=/dashboard/start so a fresh SSO login lands
//     on NexoClip's start screen rather than its generic root.
//
// IDEMPOTENCY:
//   The 409-duplicate response is treated as success — we re-store the
//   returned tenant_id/api_token in engine_subscriptions and move on. This
//   makes admin re-grants safe.

import 'server-only';
import { createHmac } from 'node:crypto';
import type {
  EngineIntegration,
  LaunchTokenInput,
  LaunchTokenResult,
  PauseInput,
  PauseResult,
  ProvisionInput,
  ProvisionResult,
} from './types';

const NEXOCLIP_SSO_TTL_SECONDS = 300; // 5 min — long enough to redirect, short enough to be safe if intercepted
// Where a fresh SSO login lands inside NexoClip. Passed as the `next` query
// param on /auth/sso; NexoClip redirects here after validating the token.
const NEXOCLIP_POST_SSO_PATH = '/dashboard/start';

function getAdminToken(): string | null {
  return process.env.NEXOCLIP_ADMIN_TOKEN ?? null;
}

function getSsoSecret(): string | null {
  return process.env.NEXOCLIP_SSO_SECRET ?? null;
}

/** Sign the launch payload with HMAC-SHA256. NexoClip's /auth/sso endpoint
 *  verifies this signature with the shared secret before creating a session.
 *  `tier` is lowercase ('free' | 'pro' | 'vip') — NexoClip's tenants.tier
 *  column must accept these.
 *
 *  ⚠️ CONTRACT CHANGE — the top tier was renamed ALL_ACCESS → VIP, so this now
 *  sends 'vip' where it previously sent 'all_access'. NexoClip's tier enum must
 *  add 'vip' (migration 013) BEFORE this ships, or VIP/admin SSO logins fail.
 *  See supabase/migrations/0026_rename_all_access_to_vip.sql. */
function signLaunchToken(payload: {
  user_id: string;
  email: string;
  tenant_id: string;
  tier: string;
  exp: number;
}): string {
  const secret = getSsoSecret();
  if (!secret) throw new Error('NEXOCLIP_SSO_SECRET not configured');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export const nexoclipIntegration: EngineIntegration = {
  slug: 'nexoclip',

  async provision({
    userId,
    email,
    fullName,
    effectiveTier,
    engine,
  }: ProvisionInput): Promise<ProvisionResult> {
    if (!engine.adminApiBase) {
      return { ok: false, reason: 'not_configured', error: 'NexoClip admin_api_base not set' };
    }
    const token = getAdminToken();
    if (!token) {
      return { ok: false, reason: 'not_configured', error: 'NEXOCLIP_ADMIN_TOKEN missing' };
    }

    let response: Response;
    try {
      response = await fetch(`${engine.adminApiBase}/tenants`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // We use Nexo AI's user_id as the external_user_id on NexoClip's side
          // so the link is bidirectional + we can detect duplicates cleanly.
          external_user_id: userId,
          email,
          display_name: fullName ?? email.split('@')[0],
          // Lowercase format ('free' / 'pro' / 'vip') — what NexoClip's
          // tenants.tier column expects per their migration 013 (must add 'vip').
          tier: effectiveTier.toLowerCase(),
        }),
      });
    } catch (err) {
      return {
        ok: false,
        reason: 'network',
        error: err instanceof Error ? err.message : 'fetch failed',
      };
    }

    // 409 = tenant already exists. Treat as success and use the returned ids.
    if (response.status === 409 || response.status === 200 || response.status === 201) {
      try {
        const data = (await response.json()) as {
          tenant_id?: string;
          api_token?: string;
          error?: string;
        };
        if (!data.tenant_id || !data.api_token) {
          return { ok: false, reason: 'engine_error', error: 'NexoClip response missing fields' };
        }
        return {
          ok: true,
          externalUserId: data.tenant_id,
          credentials: { api_token: data.api_token },
        };
      } catch {
        return { ok: false, reason: 'engine_error', error: 'NexoClip returned invalid JSON' };
      }
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'auth_error', error: 'NexoClip rejected admin token' };
    }

    const errText = await response.text().catch(() => '');
    return {
      ok: false,
      reason: 'engine_error',
      error: `NexoClip ${response.status}: ${errText.slice(0, 200)}`,
    };
  },

  async buildLaunchUrl({
    userId,
    email,
    effectiveTier,
    externalUserId,
    engine,
  }: LaunchTokenInput): Promise<LaunchTokenResult> {
    if (!engine.externalUrl) {
      return { ok: false, reason: 'not_configured', error: 'NexoClip external_url not set' };
    }
    if (!externalUserId) {
      return {
        ok: false,
        reason: 'not_provisioned',
        error: 'User has not been provisioned in NexoClip yet',
      };
    }
    if (!getSsoSecret()) {
      return { ok: false, reason: 'not_configured', error: 'NEXOCLIP_SSO_SECRET missing' };
    }

    let token: string;
    try {
      token = signLaunchToken({
        user_id: userId,
        email,
        tenant_id: externalUserId,
        tier: effectiveTier.toLowerCase(),
        exp: Math.floor(Date.now() / 1000) + NEXOCLIP_SSO_TTL_SECONDS,
      });
    } catch (err) {
      return {
        ok: false,
        reason: 'not_configured',
        error: err instanceof Error ? err.message : 'sign failed',
      };
    }

    const url =
      `${engine.externalUrl}/auth/sso?token=${encodeURIComponent(token)}` +
      `&next=${encodeURIComponent(NEXOCLIP_POST_SSO_PATH)}`;
    return { ok: true, url };
  },

  async pause(input: PauseInput): Promise<PauseResult> {
    return setTenantStatus(input, 'paused');
  },

  async resume(input: PauseInput): Promise<PauseResult> {
    return setTenantStatus(input, 'active');
  },
};

/** Shared implementation for pause + resume — both POST the same endpoint
 *  with a different status value. Idempotent on the NexoClip side. */
async function setTenantStatus(
  { externalUserId, engine }: PauseInput,
  status: 'active' | 'paused',
): Promise<PauseResult> {
  if (!engine.adminApiBase) {
    return { ok: false, reason: 'not_configured', error: 'NexoClip admin_api_base not set' };
  }
  const token = getAdminToken();
  if (!token) {
    return { ok: false, reason: 'not_configured', error: 'NEXOCLIP_ADMIN_TOKEN missing' };
  }
  if (!externalUserId) {
    return { ok: false, reason: 'engine_error', error: 'tenant_id missing on engine_subscriptions row' };
  }

  let response: Response;
  try {
    response = await fetch(
      `${engine.adminApiBase}/tenants/${encodeURIComponent(externalUserId)}/status`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      },
    );
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      error: err instanceof Error ? err.message : 'fetch failed',
    };
  }

  if (response.status === 200 || response.status === 204) {
    return { ok: true };
  }
  if (response.status === 401 || response.status === 403) {
    return { ok: false, reason: 'auth_error', error: 'NexoClip rejected admin token' };
  }
  if (response.status === 404) {
    // Tenant doesn't exist on NexoClip — likely never provisioned. Treat as
    // success for pause (nothing to pause) and as error for resume.
    return status === 'paused'
      ? { ok: true }
      : { ok: false, reason: 'engine_error', error: 'Tenant not found on NexoClip' };
  }
  const errText = await response.text().catch(() => '');
  return {
    ok: false,
    reason: 'engine_error',
    error: `NexoClip ${response.status}: ${errText.slice(0, 200)}`,
  };
}
