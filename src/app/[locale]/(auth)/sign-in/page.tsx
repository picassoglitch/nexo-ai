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
    <main className="auth-shell">
      <div className="auth-status">
        <span className="auth-status-dot" />
        {t('liveStatus')}
      </div>

      <div className="auth-card">
        <div className="auth-section auth-section-primary">
          <div className="auth-kicker">{t('newTitle')}</div>
          <h1 className="auth-headline">{t('newSubtitle')}</h1>

          {errorMessage && <div className="auth-error">{errorMessage}</div>}

          <GoogleSignInButton next={next} variant="premium" />

          <ul className="auth-benefits">
            <li>
              <span className="ab-tick">✓</span>
              {t('benefits.1')}
            </li>
            <li>
              <span className="ab-tick">✓</span>
              {t('benefits.2')}
            </li>
            <li>
              <span className="ab-tick">✓</span>
              {t('benefits.3')}
            </li>
          </ul>
        </div>

        <div className="auth-divider">
          <span>{t('returningTitle')}</span>
        </div>

        <div className="auth-section auth-section-returning">
          <p className="auth-returning-copy">{t('returningSubtitle')}</p>
          <GoogleSignInButton next={next} variant="compact" />
        </div>

        <p className="auth-social-proof">{t('socialProof')}</p>
      </div>

      <p className="auth-fine">{t('fine')}</p>
    </main>
  );
}
