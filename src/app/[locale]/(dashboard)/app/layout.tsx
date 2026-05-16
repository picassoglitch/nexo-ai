import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { getSessionUser, requireUser } from '@/lib/auth/session';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';
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
  // Real tier read from profiles.tier (0004 migration). The sidebar pill flips
  // automatically when the admin changes someone's tier from /dashboard/team
  // or the user upgrades their own plan from /app/subscription.
  const tier = session?.tier ?? 'FREE';
  const tierLabel = tier === 'ALL_ACCESS' ? 'ALL-ACCESS' : tier;
  const isAdmin = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN';

  return (
    <div className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
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
