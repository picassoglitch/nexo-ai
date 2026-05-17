import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { getSessionUser, requireUser } from '@/lib/auth/session';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';
import { WorkspaceProfileSubscriber } from '@/components/workspace/workspace-profile-subscriber';
import { effectiveTier, isAdminRole, tierLabelShort } from '@/lib/billing/tiers';
import '../dashboard/dashboard.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--cc-body',
  display: 'swap',
});
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--cc-disp',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--cc-mono',
  display: 'swap',
});

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/app');
  const session = await getSessionUser();
  const email = session?.user.email ?? 'operator@nexo.ai';
  const meta = session?.user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    email.split('@')[0] ||
    'Operator';
  const initial = fullName.charAt(0).toUpperCase();
  // Stored tier from profiles.tier — only matters for non-admin users.
  // Admins get effective ALL_ACCESS no matter what, via effectiveTier().
  // The sidebar pill shows the EFFECTIVE tier so the experience matches what
  // they can actually do — admins see "ALL-ACCESS" regardless of billing row.
  const role = session?.role ?? 'VIEWER';
  const isAdmin = isAdminRole(role);
  const storedTier = session?.tier ?? 'FREE';
  const tier = effectiveTier(role, storedTier);
  const tierLabel = isAdmin ? `${tierLabelShort(tier)} · ADMIN` : tierLabelShort(tier);

  return (
    <div className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      {session?.user.id && <WorkspaceProfileSubscriber userId={session.user.id} />}
      <WorkspaceShell
        userInitial={initial}
        userName={fullName}
        tierLabel={tierLabel}
        isAdmin={isAdmin}
      >
        {children}
      </WorkspaceShell>
    </div>
  );
}
