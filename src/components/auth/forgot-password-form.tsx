'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      // After the user clicks the email link, Supabase hands the recovery
      // `code` to /auth/callback, which exchanges it for a session and then
      // redirects to `next` — our reset page, where updateUser() can run.
      // Keep the user's locale on the reset page (en has no prefix).
      const resetPath = locale === 'en' ? '/reset-password' : `/${locale}/reset-password`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        resetPath,
      )}`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (err) {
        // Don't leak whether the email exists — only surface rate limits.
        if (err.code === 'over_email_send_rate_limit' || err.code === 'over_request_rate_limit') {
          setError(t('errorRateLimit'));
          return;
        }
        // Any other failure: still show the neutral success state below.
      }
      setSentTo(email);
    });
  }

  if (sentTo) {
    return (
      <div className="auth-inbox-success">
        <div className="auth-inbox-icon">✓</div>
        <h3 className="auth-inbox-title">{t('checkInboxTitle')}</h3>
        <p className="auth-inbox-body">{t('checkInboxBody', { email: sentTo })}</p>
        <Link href="/sign-in" className="auth-mode-switch-link">
          {t('backToSignIn')}
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-email-form" onSubmit={handleSubmit} noValidate>
      <p className="auth-inbox-body" style={{ maxWidth: 'none', textAlign: 'left' }}>
        {t('intro')}
      </p>

      <div className="auth-field">
        <label htmlFor="auth-email">{t('emailLabel')}</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
        />
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? '...' : t('submit')}
      </button>

      <p className="auth-mode-switch">
        <Link href="/sign-in" className="auth-mode-switch-link">
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  );
}
