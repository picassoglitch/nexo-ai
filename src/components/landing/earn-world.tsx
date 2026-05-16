'use client';

import { useTranslations } from 'next-intl';
import { usePath } from './use-path';

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

export function EarnWorld() {
  const t = useTranslations('earn');
  const tBots = useTranslations('bots');
  const tDash = useTranslations('dash');
  const tPricing = useTranslations('pricing');
  const tPrice = useTranslations('price');
  const tAcademy = useTranslations('academy');
  const { path } = usePath();
  const recede = path !== null && path !== 'earn';

  const tiers: Array<{ k: 'free' | 'pro' | 'vip'; featured: boolean }> = [
    { k: 'free', featured: false },
    { k: 'pro', featured: true },
    { k: 'vip', featured: false },
  ];

  return (
    <section
      id="earn-world"
      className={`section-pad path-section${recede ? ' recede' : ''}`}
      data-world="earn"
    >
      <div className="section-head">
        <div>
          <div className="path-tag earn">
            <span className="pt-dot" />
            <span>{t('tag')}</span>
          </div>
          <div className="section-num">
            03 — <span>{t('num')}</span>
          </div>
          <h2 className="section-title" dangerouslySetInnerHTML={{ __html: t('title') }} />
        </div>
        <p className="section-desc">{t('desc')}</p>
      </div>

      <div className="bots-wrap">
        <div className="bots-copy reveal">
          <h3 dangerouslySetInnerHTML={{ __html: tBots('title') }} />
          <p>{tBots('p')}</p>
          <ul className="bots-feats">
            {[1, 2, 3, 4].map((i) => (
              <li key={i}>
                <span className="check">[+]</span>
                <div>
                  <b>{tBots(`feat${i}.b`)}</b> {tBots(`feat${i}.t`)}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-primary" onClick={() => scrollToId('contact')}>
            <span>{t('cta')}</span>
            <span className="arrow">→</span>
          </button>
        </div>

        <div className="dashboard-mock reveal d1">
          <div className="dash-bar">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
            <div className="dash-url">app.nexo-ai.world/dashboard</div>
          </div>
          <div className="dash-body">
            <div className="dash-row">
              <h5>Quantor Polybot</h5>
              <div className="dash-pill">
                <span className="live" />
                SHADOW LIVE
              </div>
            </div>
            <div className="dash-stats">
              <div className="dash-stat">
                <div className="ds-label">{tDash('pnl')}</div>
                <div className="ds-val up">+12.4%</div>
              </div>
              <div className="dash-stat">
                <div className="ds-label">{tDash('trades')}</div>
                <div className="ds-val">218</div>
              </div>
              <div className="dash-stat">
                <div className="ds-label">{tDash('winrate')}</div>
                <div className="ds-val up">61%</div>
              </div>
            </div>
            <div className="dash-chart">
              <svg viewBox="0 0 400 110" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c6f24e" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#c6f24e" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,82 L40,75 L80,80 L120,58 L160,64 L200,44 L240,49 L280,29 L320,36 L360,18 L400,24 L400,110 L0,110 Z"
                  fill="url(#cg)"
                />
                <path
                  d="M0,82 L40,75 L80,80 L120,58 L160,64 L200,44 L240,49 L280,29 L320,36 L360,18 L400,24"
                  fill="none"
                  stroke="#c6f24e"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="dash-bots">
              <div className="dash-bot">
                <div className="db-name">
                  <div className="db-icon">◆</div>
                  <span>{tDash('bot1')}</span>
                </div>
                <div className="db-status active">{tDash('running')}</div>
              </div>
              <div className="dash-bot">
                <div className="db-name">
                  <div className="db-icon">▲</div>
                  <span>{tDash('bot2')}</span>
                </div>
                <div className="db-status active">{tDash('running')}</div>
              </div>
              <div className="dash-bot">
                <div className="db-name">
                  <div className="db-icon">●</div>
                  <span>{tDash('bot3')}</span>
                </div>
                <div className="db-status">{tDash('locked')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-head" style={{ marginBottom: 46 }}>
        <div>
          <div className="section-num" style={{ color: 'var(--acid)' }}>
            03.1 — <span>{tPricing('num')}</span>
          </div>
          <h2 className="section-title" dangerouslySetInnerHTML={{ __html: tPricing('title') }} />
        </div>
        <p className="section-desc">{tPricing('desc')}</p>
      </div>

      <div className="pricing-grid">
        {tiers.map((tier, idx) => (
          <div
            key={tier.k}
            className={`price-card${tier.featured ? ' featured' : ''} reveal${idx > 0 ? ` d${idx}` : ''}`}
            data-badge={tier.featured ? tPrice('pro.badge') : undefined}
          >
            <div className="price-name">{tPrice(`${tier.k}.name`)}</div>
            <div className="price-amt">
              {tPrice(`${tier.k}.amt`)}
              <span className="per">{tPrice(`${tier.k}.per`)}</span>
            </div>
            <div className="price-tagline">{tPrice(`${tier.k}.tag`)}</div>
            <ul className="price-feats">
              {[1, 2, 3, 4, 5].map((f) => {
                const muted = tier.k === 'free' && f === 5;
                return (
                  <li key={f} className={muted ? 'muted' : undefined}>
                    <span className="tick">{muted ? '○' : '✓'}</span>
                    {tPrice(`${tier.k}.f${f}`)}
                  </li>
                );
              })}
            </ul>
            <PrototypeButton className="price-btn" label={tPrice(`${tier.k}.btn`)} />
          </div>
        ))}
      </div>

      <div
        className="price-addon reveal"
        dangerouslySetInnerHTML={{ __html: tPrice('addon') }}
      />

      <div className="academy-strip reveal">
        <div>
          <h4 dangerouslySetInnerHTML={{ __html: tAcademy('title') }} />
          <p>{tAcademy('p')}</p>
        </div>
        <PrototypeButton className="as-btn" label={tAcademy('btn')} />
      </div>
    </section>
  );
}

// TODO step 07-CONTACT: wire to Resend. For now flashes prototype text.
function PrototypeButton({ className, label }: { className: string; label: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        const btn = e.currentTarget;
        const orig = btn.textContent;
        btn.textContent =
          document.documentElement.lang === 'es'
            ? 'Prototipo — se conecta en desarrollo'
            : 'Prototype — wires up in build phase';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1500);
      }}
    >
      {label}
    </button>
  );
}
