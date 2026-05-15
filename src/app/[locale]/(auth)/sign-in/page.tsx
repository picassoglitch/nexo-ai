import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error, next } = await searchParams;
  const t = await getTranslations('auth.signIn');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/account');

  const errorMessage =
    error === 'missing_code' ? t('errorMissingCode') : error ? t('errorGeneric') : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-white/10 rounded-2xl bg-panel p-10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">{t('title')}</h1>
          <p className="text-sm text-ink-dim">{t('subtitle')}</p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
            {errorMessage}
          </div>
        )}

        <GoogleSignInButton next={next} />

        <p className="mt-6 text-center text-xs text-ink-faint">{t('fine')}</p>
      </div>
    </main>
  );
}
