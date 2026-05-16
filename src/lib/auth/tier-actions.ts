'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, type SubscriptionTier } from './session';

const VALID_TIERS: SubscriptionTier[] = ['FREE', 'PRO', 'ALL_ACCESS'];

interface ChangeResult {
  ok: boolean;
  error?: string;
  /** True when the call needs a real payment flow before the change actually applies.
   *  In v1 we persist the change immediately and flag this so the UI can hint at it.
   *  Step 05-PAYMENTS will gate the write behind a Mercado Pago checkout completion.
   */
  paymentRequired?: boolean;
}

export async function changeUserTier(
  targetUserId: string,
  newTier: SubscriptionTier,
): Promise<ChangeResult> {
  if (!VALID_TIERS.includes(newTier)) {
    return { ok: false, error: 'Tier inválido' };
  }

  const session = await getSessionUser();
  if (!session) return { ok: false, error: 'No autenticado' };

  const isSelf = targetUserId === session.user.id;
  const isAdmin = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN';

  // Permission: admins can change anyone, users can change themselves.
  if (!isSelf && !isAdmin) {
    return { ok: false, error: 'Solo admins pueden cambiar el tier de otros' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ tier: newTier })
    .eq('id', targetUserId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/dashboard/team');
  revalidatePath('/app');
  revalidatePath('/app/subscription');

  // For a self-change that costs money, flag that real payment would be required
  // in production — UI shows a "demo mode" note. Admin-led changes bypass this.
  const paymentRequired = isSelf && !isAdmin && newTier !== 'FREE';

  return { ok: true, paymentRequired };
}
