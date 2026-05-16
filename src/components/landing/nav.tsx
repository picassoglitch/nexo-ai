'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FusionLogo } from './fusion-logo';
import { usePath, type Path } from './use-path';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export function LandingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations('nav');
  const tAccount = useTranslations('auth.account');
  const { setPath } = usePath();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, navKey: string | null) => {
    e.preventDefault();
    if (navKey && navKey !== 'proof') {
      setPath(navKey as Path, { scroll: false });
    }
    const target =
      navKey === 'proof'
        ? 'proof'
        : navKey === 'client'
          ? 'client-world'
          : navKey === 'partner'
            ? 'partner-world'
            : navKey === 'earn'
              ? 'earn-world'
              : 'contact';
    // Defer scroll until after React + Next.js has committed the reordered DOM.
    // rAF alone isn't enough — the URL-driven re-render takes 100-150ms in dev.
    setTimeout(() => scrollToId(target), 180);
  };

  return (
    <nav>
      <div className="logo">
        <FusionLogo id="navMark" triggerHover />
        NEXO<span style={{ color: 'var(--path)', transition: 'color .4s' }}>AI</span>
      </div>
      <div className="nav-right">
        <div className="nav-links">
          <a href="#proof" onClick={(e) => handleNavClick(e, 'proof')}>
            {t('proof')}
          </a>
          <a href="#client-world" onClick={(e) => handleNavClick(e, 'client')}>
            {t('client')}
          </a>
          <a href="#partner-world" onClick={(e) => handleNavClick(e, 'partner')}>
            {t('partner')}
          </a>
          <a href="#earn-world" onClick={(e) => handleNavClick(e, 'earn')}>
            {t('earn')}
          </a>
        </div>
        {isAuthenticated ? (
          <Link href="/account" className="nav-cta">
            {tAccount('title')}
          </Link>
        ) : (
          <a
            href="#contact"
            className="nav-cta"
            onClick={(e) => {
              e.preventDefault();
              scrollToId('contact');
            }}
          >
            {t('cta')}
          </a>
        )}
      </div>
    </nav>
  );
}
