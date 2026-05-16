'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, isSuperAdminEmail, type UserRole } from './session';

const VALID_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'EDITOR', 'VIEWER', 'CLIENT'];

export async function changeUserRole(
  targetUserId: string,
  newRole: UserRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!VALID_ROLES.includes(newRole)) {
    return { ok: false, error: 'Invalid role' };
  }

  const session = await getSessionUser();
  if (!session) return { ok: false, error: 'Not authenticated' };
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    return { ok: false, error: 'Only ADMIN or SUPER_ADMIN can change roles' };
  }

  const supabase = await createClient();

  // Fetch target so we can guard a few edge cases.
  const { data: target } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', targetUserId)
    .maybeSingle();

  if (!target) return { ok: false, error: 'User not found' };

  // Allowlisted SUPER_ADMIN emails can't be demoted via the UI — they're forced
  // back by getSessionUser() on the next request anyway. Show an honest error.
  if (isSuperAdminEmail(target.email) && newRole !== 'SUPER_ADMIN') {
    return {
      ok: false,
      error: 'Este usuario está en SUPER_ADMIN_EMAILS — el rol se restaura desde el entorno.',
    };
  }

  // Only SUPER_ADMIN can promote anyone to SUPER_ADMIN.
  if (newRole === 'SUPER_ADMIN' && session.role !== 'SUPER_ADMIN') {
    return { ok: false, error: 'Solo un Super Admin puede promover a Super Admin' };
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  revalidatePath('/dashboard/team');
  return { ok: true };
}
