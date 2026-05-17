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
