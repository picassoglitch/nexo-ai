// NexoCrypto integration — talks to NexoCrypto's FastAPI backend.
//
// Mirrors the NexoClip integration contract so the engine_subscriptions flow
// works identically: provision a tenant, get back tenant_id + api_token, then
// sign a launch token for SSO redirect.
//
// REQUIRED ENV VARS:
//   NEXOCRYPTO_ADMIN_TOKEN  Bearer token NexoCrypto's /api/admin endpoints accept.
//                            NEVER expose to clients. Set in .env.local + Vercel.
//   NEXOCRYPTO_SSO_SECRET   HMAC secret shared with NexoCrypto — used to sign the
//                            launch token. Match NexoCrypto's NEXO_AI_SSO_SECRET.
//
// CONTRACT (what NexoCrypto must expose):
//
//   POST {admin_api_base}/tenants
//     Headers:  Authorization: Bearer <NEXOCRYPTO_ADMIN_TOKEN>
//     Body:     { external_user_id, email, display_name, tier }
//     Returns:  { tenant_id, api_token }      (200/201)
//               { error: 'duplicate', tenant_id, api_token }  (409 — already exists)
//
//   POST {admin_api_base}/tenants/{tenant_id}/status
//     Headers:  Authorization: Bearer <NEXOCRYPTO_ADMIN_TOKEN>
//     Body:     { status: 'active' | 'paused' }
//
//   GET {external_url}/auth/sso?token=<signed>
//     Engine validates HMAC, sets session cookie, redirects to its dashboard.

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

const NEXOCRYPTO_SSO_TTL_SECONDS = 300;

function getAdminToken(): string | null {
  return process.env.NEXOCRYPTO_ADMIN_TOKEN ?? null;
}

function getSsoSecret(): string | null {
  return process.env.NEXOCRYPTO_SSO_SECRET ?? null;
}

function signLaunchToken(payload: {
  user_id: string;
  email: string;
  tenant_id: string;
  tier: string;
  exp: number;
}): string {
  const secret = getSsoSecret();
  if (!secret) throw new Error('NEXOCRYPTO_SSO_SECRET not configured');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export const nexocryptoIntegration: EngineIntegration = {
  slug: 'nexocrypto',

  async provision({
    userId,
    email,
    fullName,
    effectiveTier,
    engine,
  }: ProvisionInput): Promise<ProvisionResult> {
    if (!engine.adminApiBase) {
      return { ok: false, reason: 'not_configured', error: 'NexoCrypto admin_api_base not set' };
    }
    const token = getAdminToken();
    if (!token) {
      return { ok: false, reason: 'not_configured', error: 'NEXOCRYPTO_ADMIN_TOKEN missing' };
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
          return { ok: false, reason: 'engine_error', error: 'NexoCrypto response missing fields' };
        }
        return {
          ok: true,
          externalUserId: data.tenant_id,
          credentials: { api_token: data.api_token },
        };
      } catch {
        return { ok: false, reason: 'engine_error', error: 'NexoCrypto returned invalid JSON' };
      }
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'auth_error', error: 'NexoCrypto rejected admin token' };
    }

    const errText = await response.text().catch(() => '');
    return {
      ok: false,
      reason: 'engine_error',
      error: `NexoCrypto ${response.status}: ${errText.slice(0, 200)}`,
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
      return { ok: false, reason: 'not_configured', error: 'NexoCrypto external_url not set' };
    }
    if (!externalUserId) {
      return {
        ok: false,
        reason: 'not_provisioned',
        error: 'User has not been provisioned in NexoCrypto yet',
      };
    }
    if (!getSsoSecret()) {
      return { ok: false, reason: 'not_configured', error: 'NEXOCRYPTO_SSO_SECRET missing' };
    }

    let token: string;
    try {
      token = signLaunchToken({
        user_id: userId,
        email,
        tenant_id: externalUserId,
        tier: effectiveTier.toLowerCase(),
        exp: Math.floor(Date.now() / 1000) + NEXOCRYPTO_SSO_TTL_SECONDS,
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
    return { ok: false, reason: 'not_configured', error: 'NexoCrypto admin_api_base not set' };
  }
  const token = getAdminToken();
  if (!token) {
    return { ok: false, reason: 'not_configured', error: 'NEXOCRYPTO_ADMIN_TOKEN missing' };
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
    return { ok: false, reason: 'auth_error', error: 'NexoCrypto rejected admin token' };
  }
  if (response.status === 404) {
    return status === 'paused'
      ? { ok: true }
      : { ok: false, reason: 'engine_error', error: 'Tenant not found on NexoCrypto' };
  }
  const errText = await response.text().catch(() => '');
  return {
    ok: false,
    reason: 'engine_error',
    error: `NexoCrypto ${response.status}: ${errText.slice(0, 200)}`,
  };
}
