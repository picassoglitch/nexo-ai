import { setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/session';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MainShell } from '@/components/dashboard/main-shell';
import { ActivityRail } from '@/components/dashboard/activity-rail';

const SUPER_ADMIN_EMAILS =
  process.env.SUPER_ADMIN_EMAILS?.split(',').map((s) => s.trim().toLowerCase()) ?? [];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const email = user?.email ?? 'operator@nexo.ai';
  const meta = user?.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    email.split('@')[0] ||
    'Operator';
  const initial = fullName.charAt(0).toUpperCase();
  const isSuper = SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
  const role = isSuper ? 'Super Admin · Org root' : 'Operator';

  return (
    <div className="cc-shell">
      <Sidebar userInitial={initial} userName={fullName} userRole={role} />
      <MainShell />
      <ActivityRail />
    </div>
  );
}
