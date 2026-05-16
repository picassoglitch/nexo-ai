'use client';

import { useTranslations } from 'next-intl';

export function ProofSection() {
  const t = useTranslations('proof');
  return (
    <section id="proof" className="section-pad">
      <div className="section-head">
        <div>
          <div className="section-num">
            00 — <span>{t('num')}</span>
          </div>
          <h2 className="section-title" dangerouslySetInnerHTML={{ __html: t.raw('title') as string }} />
        </div>
        <p className="section-desc">{t('desc')}</p>
      </div>
      <div className="proof-stats reveal">
        <div className="stat">
          <div className="num">
            14<span className="unit">+</span>
          </div>
          <div className="label">{t('stat1')}</div>
        </div>
        <div className="stat">
          <div className="num">
            PCI<span className="unit"> DSS 4.0</span>
          </div>
          <div className="label">{t('stat2')}</div>
        </div>
        <div className="stat">
          <div className="num">
            8<span className="unit">+</span>
          </div>
          <div className="label">{t('stat3')}</div>
        </div>
        <div className="stat">
          <div className="num">
            3<span className="unit"> {t('units.verticals')}</span>
          </div>
          <div className="label">{t('stat4')}</div>
        </div>
      </div>
      <p
        className="proof-line reveal d1"
        dangerouslySetInnerHTML={{ __html: t.raw('line') as string }}
      />
    </section>
  );
}
