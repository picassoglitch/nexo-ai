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
  // For v1, tier label is derived from a placeholder. Wires to Supabase column or
  // Mercado Pago subscription state in step 05.
  const tierLabel = 'FREE';
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
