import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'EDITOR' | 'VIEWER' | 'CLIENT';

const ROLE_TIER: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  OPERATOR: 60,
  EDITOR: 40,
  VIEWER: 20,
  CLIENT: 10,
};

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export interface SessionUser {
  user: User;
  role: UserRole;
  orgId: string | null;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Reads the authenticated user + their stored role + org from `profiles`.
 * SUPER_ADMIN_EMAILS allowlist forces role to SUPER_ADMIN regardless of stored value
 * — this is the durable backstop documented in the build spec.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .maybeSingle();
  const storedRole = (profile?.role as UserRole | undefined) ?? 'VIEWER';
  const role: UserRole = isSuperAdminEmail(user.email) ? 'SUPER_ADMIN' : storedRole;
  return {
    user,
    role,
    orgId: (profile?.org_id as string | null) ?? null,
  };
}

export async function requireUser(currentPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : '';
    redirect(`/sign-in${next}`);
  }
  return user;
}

/**
 * Server-side role guard. Use in route handlers and server components reading org data.
 * Returns the session user if their role meets the minimum tier, otherwise 401/403.
 */
export async function requireRole(min: UserRole, currentPath?: string): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) {
    const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : '';
    redirect(`/sign-in${next}`);
  }
  if (ROLE_TIER[session.role] < ROLE_TIER[min]) {
    // Insufficient role — bounce to /account (or /sign-in if guard semantic mismatch).
    redirect('/account?error=insufficient_role');
  }
  return session;
}

/**
 * Single-helper RBAC check. v1 uses role tiers; per-action policies come later.
 * Mark TODO in DEVIATIONS so this is replaced before any privileged op (restart worker etc.) ships.
 */
export function can(role: UserRole, action: string): boolean {
  // v1 mapping — coarse role tiers. Replace with per-action policy in step 06+.
  const tier = ROLE_TIER[role] ?? 0;
  switch (action) {
    case 'view':
      return tier >= ROLE_TIER.VIEWER;
    case 'edit':
      return tier >= ROLE_TIER.EDITOR;
    case 'operate':
    case 'restart_worker':
    case 'open_console':
      return tier >= ROLE_TIER.OPERATOR;
    case 'manage_team':
    case 'invite':
      return tier >= ROLE_TIER.ADMIN;
    case 'org_root':
    case 'destroy':
      return tier >= ROLE_TIER.SUPER_ADMIN;
    default:
      return tier >= ROLE_TIER.VIEWER;
  }
}
