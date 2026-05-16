'use client';

import { useTranslations } from 'next-intl';
import { FusionLogo } from './fusion-logo';

export function LandingFooter() {
  const tFooter = useTranslations('footer');
  const tNav = useTranslations('nav');

  return (
    <footer>
      <div className="footer-top">
        <div className="footer-brand">
          <div className="logo">
            <FusionLogo id="footMark" />
            NEXO
            <span style={{ color: 'var(--path)', transition: 'color .4s' }}>AI</span>
          </div>
          <p>{tFooter('brand')}</p>
        </div>
        <div className="footer-col">
          <h6>{tFooter('build')}</h6>
          <a href="#client-world">{tNav('client')}</a>
          <a href="#partner-world">{tNav('partner')}</a>
          <a href="#proof">{tFooter('track')}</a>
          <a href="#contact">{tFooter('contact')}</a>
        </div>
        <div className="footer-col">
          <h6>{tFooter('earn')}</h6>
          <a href="#earn-world">{tFooter('bots')}</a>
          <a href="#earn-world">{tFooter('pricing')}</a>
          <a href="#contact">{tFooter('signin')}</a>
          <a href="#earn-world">Nexo Academy</a>
        </div>
        <div className="footer-col">
          <h6>{tFooter('connect')}</h6>
          <a href="#">Kick</a>
          <a href="#">Instagram</a>
          <a href="#">TikTok</a>
          <a href="#">LinkedIn</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Nexo AI — nexo-ai.world</p>
        <div className="socials">
          <a href="#">{tFooter('privacy')}</a>
          <a href="#">{tFooter('terms')}</a>
          <a href="#">{tFooter('status')}</a>
        </div>
      </div>
    </footer>
  );
}
