import { redirect } from 'next/navigation';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { getSessionUser, requireUser } from '@/lib/auth/session';
import { listEngines } from '@/lib/data/engines';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ProfileSubscriber } from '@/components/workspace/profile-subscriber';
import './dashboard.css';

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

function roleLabel(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin · Org root';
    case 'ADMIN':
      return 'Admin';
    case 'OPERATOR':
      return 'Operator';
    case 'EDITOR':
      return 'Editor';
    case 'CLIENT':
      return 'Client';
    default:
      return 'Viewer';
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/dashboard');

  const session = await getSessionUser();

  // Role gate: only SUPER_ADMIN and ADMIN can see the operator command center.
  // Everyone else (OPERATOR / EDITOR / VIEWER / CLIENT) is silently redirected
  // to /app — the subscriber workspace they should be using.
  // This guards every /dashboard/* route below this layout, including any URL
  // typed directly into the address bar.
  if (
    session &&
    session.role !== 'SUPER_ADMIN' &&
    session.role !== 'ADMIN'
  ) {
    redirect('/app');
  }

  const email = session?.user.email ?? 'operator@nexo.ai';
  const meta = session?.user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    email.split('@')[0] ||
    'Operator';
  const initial = fullName.charAt(0).toUpperCase();
  const role = session?.role ?? 'VIEWER';

  const engines = await listEngines();

  return (
    <div className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      {/* Auto-refresh the admin's view when their own profile changes (e.g.
          if another super-admin demotes them, the redirect to /app fires on
          the next render instead of waiting for a manual reload). */}
      {session?.user.id && <ProfileSubscriber userId={session.user.id} />}
      <DashboardShell
        initialEngines={engines}
        userInitial={initial}
        userName={fullName}
        userRole={roleLabel(role)}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
