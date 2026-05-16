import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { listBots } from '@/lib/data/bots';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

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
  const roleLabel =
    role === 'SUPER_ADMIN'
      ? 'Super Admin · Org root'
      : role === 'ADMIN'
        ? 'Admin'
        : role === 'OPERATOR'
          ? 'Operator'
          : role === 'EDITOR'
            ? 'Editor'
            : role === 'CLIENT'
              ? 'Client'
              : 'Viewer';

  const bots = await listBots();

  return (
    <DashboardClient
      initialBots={bots}
      userInitial={initial}
      userName={fullName}
      userRole={roleLabel}
    />
  );
}
