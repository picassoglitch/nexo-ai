import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { getSessionUser, requireUser } from '@/lib/auth/session';
import { listBots } from '@/lib/data/bots';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
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
  const email = session?.user.email ?? 'operator@nexo.ai';
  const meta = session?.user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    email.split('@')[0] ||
    'Operator';
  const initial = fullName.charAt(0).toUpperCase();
  const role = session?.role ?? 'VIEWER';

  const bots = await listBots();

  return (
    <div className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>
      <DashboardShell
        initialBots={bots}
        userInitial={initial}
        userName={fullName}
        userRole={roleLabel(role)}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
