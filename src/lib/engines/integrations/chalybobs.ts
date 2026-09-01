// ChalybOBS integration — talks to ChalybOBS's Next.js backend (web/ subdirectory
// in the ChalybOBS repo, deployed on Railway).
//
// Same SSO contract ChalybClip + ChalybCrypto use: provision a tenant, get back
// tenant_id + api_token, then sign an HMAC launch token for SSO redirect.
//
// REQUIRED ENV VARS (this side — set in Chalyb's .env.local + Vercel):
//   CHALYBOBS_ADMIN_TOKEN  Bearer ChalybOBS's /api/admin/* endpoints accept.
//                          NEVER expose to clients.
//   CHALYBOBS_SSO_SECRET   HMAC secret shared with ChalybOBS — used to sign the
//                          launch token. Must match the value ChalybOBS stores
//                          as `CHALYBOBS_SSO_SECRET` (same name on both sides).
//
// CONTRACT (what ChalybOBS exposes — see web/src/app/api/admin/* and
// web/src/app/auth/sso in the ChalybOBS repo):
//
//   POST {admin_api_base}/tenants
//     Headers:  Authorization: Bearer <CHALYBOBS_ADMIN_TOKEN>
//     Body:     { external_user_id, email, display_name, tier }
//     Returns:  { tenant_id, api_token }      (200)
//
//   POST {admin_api_base}/tenants/{tenant_id}/status
//     Headers:  Authorization: Bearer <CHALYBOBS_ADMIN_TOKEN>
//     Body:     { status: 'active' | 'paused' | 'cancelled' }
//
//   GET {external_url}/auth/sso?token=<signed>
//     ChalybOBS validates HMAC, sets its own session cookie, redirects to
//     /dashboard.
//
// IDEMPOTENCY:
//   Phase 0 ChalybOBS has no DB — provisioning is deterministic (same
//   external_user_id always returns the same tenant_id + api_token). When
//   ChalybOBS adds Postgres, the wire response shape stays the same; only
//   the 409-duplicate branch becomes reachable. We already handle 409.

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

const CHALYBOBS_SSO_TTL_SECONDS = 300; // 5 min — long enough to redirect, short enough to be safe if intercepted

function getAdminToken(): string | null {
  return process.env.CHALYBOBS_ADMIN_TOKEN ?? null;
}

function getSsoSecret(): string | null {
  return process.env.CHALYBOBS_SSO_SECRET ?? null;
}

function signLaunchToken(payload: {
  user_id: string;
  email: string;
  tenant_id: string;
  tier: string;
  exp: number;
}): string {
  const secret = getSsoSecret();
  if (!secret) throw new Error('CHALYBOBS_SSO_SECRET not configured');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export const chalybobsIntegration: EngineIntegration = {
  slug: 'chalybobs',

  async provision({
    userId,
    email,
    fullName,
    effectiveTier,
    engine,
  }: ProvisionInput): Promise<ProvisionResult> {
    if (!engine.adminApiBase) {
      return { ok: false, reason: 'not_configured', error: 'ChalybOBS admin_api_base not set' };
    }
    const token = getAdminToken();
    if (!token) {
      return { ok: false, reason: 'not_configured', error: 'CHALYBOBS_ADMIN_TOKEN missing' };
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
          external_user_id: userId,
          email,
          display_name: fullName ?? email.split('@')[0],
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

    if (response.status === 409 || response.status === 200 || response.status === 201) {
      try {
        const data = (await response.json()) as {
          tenant_id?: string;
          api_token?: string;
          error?: string;
        };
        if (!data.tenant_id || !data.api_token) {
          return { ok: false, reason: 'engine_error', error: 'ChalybOBS response missing fields' };
        }
        return {
          ok: true,
          externalUserId: data.tenant_id,
          credentials: { api_token: data.api_token },
        };
      } catch {
        return { ok: false, reason: 'engine_error', error: 'ChalybOBS returned invalid JSON' };
      }
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'auth_error', error: 'ChalybOBS rejected admin token' };
    }

    const errText = await response.text().catch(() => '');
    return {
      ok: false,
      reason: 'engine_error',
      error: `ChalybOBS ${response.status}: ${errText.slice(0, 200)}`,
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
      return { ok: false, reason: 'not_configured', error: 'ChalybOBS external_url not set' };
    }
    if (!externalUserId) {
      return {
        ok: false,
        reason: 'not_provisioned',
        error: 'User has not been provisioned in ChalybOBS yet',
      };
    }
    if (!getSsoSecret()) {
      return { ok: false, reason: 'not_configured', error: 'CHALYBOBS_SSO_SECRET missing' };
    }

    let token: string;
    try {
      token = signLaunchToken({
        user_id: userId,
        email,
        tenant_id: externalUserId,
        tier: effectiveTier.toLowerCase(),
        exp: Math.floor(Date.now() / 1000) + CHALYBOBS_SSO_TTL_SECONDS,
      });
    } catch (err) {
      return {
        ok: false,
        reason: 'not_configured',
        error: err instanceof Error ? err.message : 'sign failed',
      };
    }

    const url = `${engine.externalUrl}/auth/sso?token=${encodeURIComponent(token)}`;
    return { ok: true, url };
  },

  async pause(input: PauseInput): Promise<PauseResult> {
    return setTenantStatus(input, 'paused');
  },

  async resume(input: PauseInput): Promise<PauseResult> {
    return setTenantStatus(input, 'active');
  },
};

async function setTenantStatus(
  { externalUserId, engine }: PauseInput,
  status: 'active' | 'paused',
): Promise<PauseResult> {
  if (!engine.adminApiBase) {
    return { ok: false, reason: 'not_configured', error: 'ChalybOBS admin_api_base not set' };
  }
  const token = getAdminToken();
  if (!token) {
    return { ok: false, reason: 'not_configured', error: 'CHALYBOBS_ADMIN_TOKEN missing' };
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
    return { ok: false, reason: 'auth_error', error: 'ChalybOBS rejected admin token' };
  }
  if (response.status === 404) {
    return status === 'paused'
      ? { ok: true }
      : { ok: false, reason: 'engine_error', error: 'Tenant not found on ChalybOBS' };
  }
  const errText = await response.text().catch(() => '');
  return {
    ok: false,
    reason: 'engine_error',
    error: `ChalybOBS ${response.status}: ${errText.slice(0, 200)}`,
  };
}
