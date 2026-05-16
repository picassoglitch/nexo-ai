'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from './session';
import { TIER_CAPS } from '@/lib/billing/tiers';

export async function setSelectedLiveBot(
  botId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSessionUser();
  if (!session) return { ok: false, error: 'No autenticado' };

  // FREE has no live bots; ALL_ACCESS doesn't need a selection.
  // We block the action for those tiers so callers can't accidentally write a
  // selection that does nothing — keeps profiles.selected_bot_id meaningful.
  const caps = TIER_CAPS[session.tier];
  if (caps.liveBotsCount === 0) {
    return { ok: false, error: 'Tu plan no incluye ejecución en vivo. Pasa a Pro o All-Access.' };
  }
  if (caps.liveBotsCount === Infinity) {
    return {
      ok: false,
      error: 'En All-Access todos los sistemas ya están en vivo — no hay selección que hacer.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ selected_bot_id: botId })
    .eq('id', session.user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/app');
  revalidatePath('/app/bots');
  revalidatePath('/app/subscription');
  return { ok: true };
}
