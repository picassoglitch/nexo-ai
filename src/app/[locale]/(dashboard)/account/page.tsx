import { getTranslations, setRequestLocale } from 'next-intl/server';
import { requireUser } from '@/lib/auth/session';
import { SignOutButton } from '@/components/auth/sign-out-button';

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requireUser('/account');
  const t = await getTranslations('auth.account');

  return (
    <main className="min-h-screen px-6 py-24 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">{t('title')}</h1>

      <div className="border border-white/10 rounded-xl bg-panel p-6 mb-6">
        <p className="text-xs font-mono uppercase tracking-wider text-ink-faint mb-2">
          {t('signedInAs')}
        </p>
        <p className="text-lg">{user.email}</p>
        <p className="font-mono text-xs text-ink-faint mt-2">id: {user.id}</p>
      </div>

      <SignOutButton />
    </main>
  );
}
