'use server';

// Engine admin mutations — change status (active/coming_soon/deprecated) and
// tier_required (FREE/PRO/ALL_ACCESS). Used from /dashboard/engines.
//
// SECURITY:
//   1. Next.js layer checks: caller must be SUPER_ADMIN or ADMIN (session.role,
//      which already honors env-locked allowlist).
//   2. DB layer writes go through the service-role admin client so RLS can't
//      silently no-op for env-locked admins whose stored DB role lags.
//
// Audit: every change writes an audit_events row so the /dashboard/audit log
// surfaces engine catalog changes alongside user-level mutations.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { getSessionUser, type SubscriptionTier } from '@/lib/auth/session';
import type { EngineStatus } from '@/lib/data/types';

const VALID_STATUS: EngineStatus[] = ['active', 'coming_soon', 'deprecated'];
const VALID_TIERS: SubscriptionTier[] = ['FREE', 'PRO', 'ALL_ACCESS'];

type Result = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) return { ok: false as const, error: 'No autenticado' };
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    return { ok: false as const, error: 'Solo admins pueden gestionar engines' };
  }
  return { ok: true as const, session };
}

export async function changeEngineStatus(
  engineId: string,
  next: EngineStatus,
): Promise<Result> {
  if (!VALID_STATUS.includes(next)) return { ok: false, error: 'Status inválido' };
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  // Snapshot before so the audit log shows the diff.
  const { data: before } = await admin
    .from('engines')
    .select('name, status')
    .eq('id', engineId)
    .maybeSingle();

  const { data, error } = await admin
    .from('engines')
    .update({ status: next })
    .eq('id', engineId)
    .select('id');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Engine no encontrado' };

  await logAudit({
    action: 'tier.change', // closest existing action; could add 'engine.status' if needed later
    actorId: auth.session.user.id,
    actorEmail: auth.session.user.email ?? null,
    targetUserId: auth.session.user.id, // engine-level event, no target user — store actor as target placeholder
    targetEmail: auth.session.user.email ?? null,
    before: { engine_status: (before?.status as string | null) ?? null },
    after: { engine_status: next },
    metadata: {
      engine_id: engineId,
      engine_name: (before?.name as string | null) ?? null,
      kind: 'engine.status',
    },
  });

  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

export async function changeEngineTierRequired(
  engineId: string,
  next: SubscriptionTier,
): Promise<Result> {
  if (!VALID_TIERS.includes(next)) return { ok: false, error: 'Tier inválido' };
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from('engines')
    .select('name, tier_required')
    .eq('id', engineId)
    .maybeSingle();

  const { data, error } = await admin
    .from('engines')
    .update({ tier_required: next })
    .eq('id', engineId)
    .select('id');

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Engine no encontrado' };

  await logAudit({
    action: 'tier.change',
    actorId: auth.session.user.id,
    actorEmail: auth.session.user.email ?? null,
    targetUserId: auth.session.user.id,
    targetEmail: auth.session.user.email ?? null,
    before: { engine_tier_required: (before?.tier_required as string | null) ?? null },
    after: { engine_tier_required: next },
    metadata: {
      engine_id: engineId,
      engine_name: (before?.name as string | null) ?? null,
      kind: 'engine.tier_required',
    },
  });

  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

// Cap on the rate to prevent typo disasters. 500_000 cents = $5,000 MXN per
// 1M tokens. That's already 100× what we'd realistically charge (current
// guidance is $5-$100 MXN/1M), so anything above this is almost certainly
// a missing decimal point.
const MAX_ROYALTY_CENTS = 500_000;

// Same logic for the LLM cost rate. We pay providers per 1M tokens; current
// real-world rate for Claude Sonnet 4.5 is ~$180 MXN/1M (18,000 cents).
// Cap at 500k = $5,000 MXN/1M to catch a missing decimal.
const MAX_COST_CENTS = 500_000;

// Cap on the monthly fixed infra cost. $100,000 MXN/month = 10M cents.
// At our scale anything above is a typo.
const MAX_FIXED_MONTHLY_CENTS = 10_000_000;

/** Update partner_royalty_per_million_tokens_cents for an engine. Admin-only.
 *  Negative values rejected, large values capped. Stored as integer cents. */
export async function changeEngineRoyaltyRate(
  engineId: string,
  nextCents: number,
): Promise<Result> {
  if (!Number.isFinite(nextCents) || nextCents < 0) {
    return { ok: false, error: 'Cantidad inválida (debe ser ≥ 0)' };
  }
  if (nextCents > MAX_ROYALTY_CENTS) {
    return {
      ok: false,
      error: `Máximo ${MAX_ROYALTY_CENTS.toLocaleString('es-MX')} centavos por 1M tokens`,
    };
  }
  const cents = Math.round(nextCents);

  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from('engines')
    .select('name, partner_royalty_per_million_tokens_cents')
    .eq('id', engineId)
    .maybeSingle();

  const { data, error } = await admin
    .from('engines')
    .update({ partner_royalty_per_million_tokens_cents: cents })
    .eq('id', engineId)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Engine no encontrado' };

  await logAudit({
    action: 'partner.engine_assign', // closest existing verb; royalty config
    actorId: auth.session.user.id,
    actorEmail: auth.session.user.email ?? null,
    targetUserId: auth.session.user.id,
    targetEmail: auth.session.user.email ?? null,
    before: {
      royalty_per_million_cents:
        (before?.partner_royalty_per_million_tokens_cents as number | null) ?? 0,
    },
    after: { royalty_per_million_cents: cents },
    metadata: {
      engine_id: engineId,
      engine_name: (before?.name as string | null) ?? null,
      kind: 'engine.royalty_rate',
    },
  });

  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

/** What the platform pays providers per 1M tokens consumed in this engine.
 *  Cents MXN. Drives the LLM variable cost row on the per-engine detail page. */
export async function changeEngineCostRate(
  engineId: string,
  nextCents: number,
): Promise<Result> {
  if (!Number.isFinite(nextCents) || nextCents < 0) {
    return { ok: false, error: 'Cantidad inválida (debe ser ≥ 0)' };
  }
  if (nextCents > MAX_COST_CENTS) {
    return {
      ok: false,
      error: `Máximo ${MAX_COST_CENTS.toLocaleString('es-MX')} centavos por 1M tokens`,
    };
  }
  const cents = Math.round(nextCents);

  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from('engines')
    .select('name, cost_per_million_tokens_cents')
    .eq('id', engineId)
    .maybeSingle();

  const { data, error } = await admin
    .from('engines')
    .update({ cost_per_million_tokens_cents: cents })
    .eq('id', engineId)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Engine no encontrado' };

  await logAudit({
    action: 'partner.engine_assign', // reusing the closest verb; cost config
    actorId: auth.session.user.id,
    actorEmail: auth.session.user.email ?? null,
    targetUserId: auth.session.user.id,
    targetEmail: auth.session.user.email ?? null,
    before: {
      cost_per_million_cents:
        (before?.cost_per_million_tokens_cents as number | null) ?? 0,
    },
    after: { cost_per_million_cents: cents },
    metadata: {
      engine_id: engineId,
      engine_name: (before?.name as string | null) ?? null,
      kind: 'engine.cost_rate',
    },
  });

  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}

/** Monthly fixed infra cost for this engine (Modal baseline, allocated
 *  Vercel/Railway slice, dedicated nodes). Cents MXN. Doesn't scale with
 *  usage. Admin types the amortized number from the latest provider bill. */
export async function changeEngineFixedMonthlyCost(
  engineId: string,
  nextCents: number,
): Promise<Result> {
  if (!Number.isFinite(nextCents) || nextCents < 0) {
    return { ok: false, error: 'Cantidad inválida (debe ser ≥ 0)' };
  }
  if (nextCents > MAX_FIXED_MONTHLY_CENTS) {
    return {
      ok: false,
      error: `Máximo $${(MAX_FIXED_MONTHLY_CENTS / 100).toLocaleString('es-MX')} MXN/mes`,
    };
  }
  const cents = Math.round(nextCents);

  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const admin = createAdminClient();
  const { data: before } = await admin
    .from('engines')
    .select('name, fixed_monthly_cost_cents')
    .eq('id', engineId)
    .maybeSingle();

  const { data, error } = await admin
    .from('engines')
    .update({ fixed_monthly_cost_cents: cents })
    .eq('id', engineId)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: 'Engine no encontrado' };

  await logAudit({
    action: 'partner.engine_assign',
    actorId: auth.session.user.id,
    actorEmail: auth.session.user.email ?? null,
    targetUserId: auth.session.user.id,
    targetEmail: auth.session.user.email ?? null,
    before: {
      fixed_monthly_cost_cents:
        (before?.fixed_monthly_cost_cents as number | null) ?? 0,
    },
    after: { fixed_monthly_cost_cents: cents },
    metadata: {
      engine_id: engineId,
      engine_name: (before?.name as string | null) ?? null,
      kind: 'engine.fixed_monthly_cost',
    },
  });

  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}
