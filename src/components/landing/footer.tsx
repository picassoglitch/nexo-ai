import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LogoMark } from './logo-mark';
import { CONTACT, PRIVACY, REGISTER, SIGN_IN, TERMS } from './links';

export async function LandingFooter() {
  const t = await getTranslations('home.footer');
  const tNav = await getTranslations('home.nav');

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="logo">
            <LogoMark size={24} />
            <span>
              NEXO<span className="logo-accent">AI</span>
            </span>
          </div>
          <p>{t('brand')}</p>
        </div>

        <div className="site-footer-col">
          <h2>{t('product')}</h2>
          <Link href={REGISTER}>{tNav('register')}</Link>
          <Link href={SIGN_IN}>{tNav('signIn')}</Link>
          {/* Contact + legal are the only non-auth links on the public site:
              the legal pages are required public URLs for the Google OAuth app
              and MX consumer law, and contact is the pre-account support path. */}
          <Link href={CONTACT}>{t('contact')}</Link>
        </div>

        <div className="site-footer-col">
          <h2>{t('legal')}</h2>
          <Link href={PRIVACY}>{t('privacy')}</Link>
          <Link href={TERMS}>{t('terms')}</Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        <p>{t('rights')}</p>
      </div>
    </footer>
  );
}
