import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LogoMark } from './logo-mark';
import { ACCOUNT, REGISTER, SIGN_IN } from './links';

// Public site header. Two destinations only — log in, or create an account.
// No section anchors: the landing is short enough to scroll, and every route
// off this page is the auth surface.
export async function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = await getTranslations('home.nav');

  return (
    <nav className="site-nav">
      <Link href="/" className="logo" aria-label="Nexo AI">
        <LogoMark size={26} />
        <span>
          NEXO<span className="logo-accent">AI</span>
        </span>
      </Link>

      {isAuthenticated ? (
        <div className="site-nav-actions">
          <Link href={ACCOUNT} className="btn btn-primary btn-sm">
            {t('account')}
          </Link>
        </div>
      ) : (
        <div className="site-nav-actions">
          <Link href={SIGN_IN} className="nav-link">
            {t('signIn')}
          </Link>
          <Link href={REGISTER} className="btn btn-primary btn-sm">
            {t('register')}
          </Link>
        </div>
      )}
    </nav>
  );
}
