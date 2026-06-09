'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';

export function ResetPasswordForm() {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
  // Lift the gate and sign out so the user lands on a normal sign-in instead
  // of being trapped on this page by the middleware redirect.
  function handleCancel() {
    startTransition(async () => {
      const supabase = createClient();
      await fetch('/api/auth/clear-recovery', { method: 'POST' });
      await supabase.auth.signOut();
      router.push('/sign-in' as Route);
      router.refresh();
    });
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
      // Lift the recovery gate and end the recovery session, then make the
      // user sign in fresh with their NEW password. A password reset must never
      // leave a logged-in session behind — the link is for setting a password,
      // not for getting into the app.
      await fetch('/api/auth/clear-recovery', { method: 'POST' });
      await supabase.auth.signOut();
      setDone(true);
      router.push('/sign-in?reset=success' as Route);
      router.refresh();
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

  if (done) {
    return (
      <div className="auth-inbox-success">
        <div className="auth-inbox-icon">✓</div>
        <h3 className="auth-inbox-title">{t('successTitle')}</h3>
        <p className="auth-inbox-body">{t('successBody')}</p>
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
