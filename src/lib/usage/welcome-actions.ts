'use server';

// Self-serve: a first-time user accepts the welcome banner on /app.
//
// What "accepting" does:
//   1. Marks profiles.welcome_gift_claimed_at = now() so the banner never
//      shows again (idempotent — re-accepting is a no-op).
//   2. Starts the 7-day NexoClip live trial (nexoclip_trial_started_at) if
//      one isn't already running.
//   3. Best-effort provisions the user inside NexoClip so the trial's live
//      access is usable end-to-end. Non-fatal — mirrors the launch route.
//
// The "50,000 token gift" IS the existing Free monthly allocation — there is
// no separate token grant here. The /app page just renders the real balance.
//
// Admin-side grant/revoke of the same promotions lives in promo-admin-actions.ts.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/auth/session';
import { provisionEngineAccess } from '@/lib/engines/subscriptions';
import { logAudit } from '@/lib/audit/log';
import { NEXOCLIP_TRIAL_SLUG } from '@/lib/billing/tiers';

interface ClaimResult {
  ok: boolean;
  error?: string;
  alreadyClaimed?: boolean;
}

export async function claimWelcomeGift(): Promise<ClaimResult> {
  const session = await getSessionUser();
  if (!session) return { ok: false, error: 'No autenticado' };

  const userId = session.user.id;
  const admin = createAdminClient();

  const { data: before, error: readErr } = await admin
    .from('profiles')
    .select('email, welcome_gift_claimed_at, nexoclip_trial_started_at')
    .eq('id', userId)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };
  if (!before) return { ok: false, error: 'Perfil no encontrado' };

  // Idempotent — already accepted, nothing to do.
  if (before.welcome_gift_claimed_at) {
    return { ok: true, alreadyClaimed: true };
  }

  const nowIso = new Date().toISOString();
  // Only start the trial if one isn't already running (admin may have started
  // it earlier). Coalesce on the existing value.
  const trialStart = (before.nexoclip_trial_started_at as string | null) ?? nowIso;

  const { error: updErr } = await admin
    .from('profiles')
    .update({
      welcome_gift_claimed_at: nowIso,
      nexoclip_trial_started_at: trialStart,
    })
    .eq('id', userId);
  if (updErr) return { ok: false, error: updErr.message };

  // Best-effort: provision the user in NexoClip so live access works the moment
  // they open the engine. Failure here never blocks the claim (the engine page
  // has a manual reprovision affordance as backstop).
  try {
    const { data: engine } = await admin
      .from('engines')
      .select('id')
      .eq('slug', NEXOCLIP_TRIAL_SLUG)
      .maybeSingle();
    if (engine?.id) {
      await provisionEngineAccess(userId, engine.id as string, 'manual');
    }
  } catch (err) {
    console.warn('[welcome] nexoclip trial provisioning failed (non-fatal):', err);
  }

  await logAudit({
    action: 'promo.welcome_claim',
    actorId: userId,
    actorEmail: session.user.email ?? null,
    targetUserId: userId,
    targetEmail: (before.email as string | null) ?? null,
    after: { welcome_gift_claimed_at: nowIso, nexoclip_trial_started_at: trialStart },
    metadata: { via: 'welcome_banner', self_serve: true },
  });

  revalidatePath('/[locale]', 'layout');
  return { ok: true };
}
