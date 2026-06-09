'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

// Hand off to the server route that ends the recovery session + lifts the gate
// atomically. `reset` adds the success notice to the sign-in landing.
function endRecoveryUrl(locale: string, reset: boolean): string {
  const params = new URLSearchParams();
  if (locale && locale !== 'en') params.set('l', locale);
  if (reset) params.set('reset', '1');
  const qs = params.toString();
  return `/auth/end-recovery${qs ? `?${qs}` : ''}`;
}

export function ResetPasswordForm() {
  const t = useTranslations('auth.resetPassword');
  const locale = useLocale();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  // null = still checking, true/false = whether a recovery session exists.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    // The /auth/callback exchange should have set a session before redirecting
    // here. If it didn't (expired or already-used link), there's nothing to
    // update — tell the user to request a fresh link.
    supabase.auth.getUser().then(async ({ data }) => {
      const ok = !!data.user;
      setHasSession(ok);
      // No recovery session to act on → there's nothing to gate. Drop the
      // recovery cookie so a stale one can't keep bouncing the user here.
      if (!ok) await fetch('/api/auth/clear-recovery', { method: 'POST' });
    });
  }, []);

  // Escape hatch: clicked the reset link but don't actually want to reset.
  // Full navigation to the server route so signOut + cookie-clear land before
  // the next request — otherwise the middleware gate bounces the user back.
  function handleCancel() {
    window.location.href = endRecoveryUrl(locale, false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t('errorWeakPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('errorMismatch'));
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        if (err.code === 'same_password') {
          setError(t('errorSamePassword'));
          return;
        }
        if (err.code === 'weak_password') {
          setError(t('errorWeakPassword'));
          return;
        }
        setError(err.message || t('errorGeneric'));
        return;
      }
      // Password set. Hand off to the server route to end the recovery session
      // and lift the gate, landing on sign-in with the success notice. A reset
      // must never leave a logged-in session behind — the link is for setting a
      // password, not for getting into the app.
      window.location.href = endRecoveryUrl(locale, true);
    });
  }

  if (hasSession === false) {
    return (
      <div className="auth-inbox-success">
        <div className="auth-inbox-icon" style={{ borderColor: '#e0564f', color: '#e0564f', background: 'rgba(224, 86, 79, 0.12)' }}>
          !
        </div>
        <h3 className="auth-inbox-title">{t('invalidTitle')}</h3>
        <p className="auth-inbox-body">{t('invalidBody')}</p>
        <Link href="/forgot-password" className="auth-mode-switch-link">
          {t('requestNew')}
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
        <label htmlFor="auth-password">{t('passwordLabel')}</label>
        <input
          id="auth-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="auth-password-confirm">{t('confirmLabel')}</label>
        <input
          id="auth-password-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t('passwordPlaceholder')}
        />
      </div>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" className="auth-submit" disabled={pending || hasSession === null}>
        {pending ? '...' : t('submit')}
      </button>

      <p className="auth-mode-switch">
        <button
          type="button"
          className="auth-mode-switch-link"
          onClick={handleCancel}
          disabled={pending}
        >
          {t('cancel')}
        </button>
      </p>
    </form>
  );
}
