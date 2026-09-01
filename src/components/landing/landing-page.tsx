import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LandingNav } from './nav';
import { LandingFooter } from './footer';
import { RevealOnScroll } from './reveal';
import { REGISTER, SIGN_IN } from './links';

const CARDS = ['1', '2', '3'] as const;
const STEPS = ['1', '2', '3'] as const;
const PLANS = ['free', 'pro', 'vip'] as const;

// `--i` staggers siblings inside one reveal group (see [data-reveal] in globals.css).
function stagger(index: number) {
  return { '--i': index } as React.CSSProperties;
}

export async function LandingPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = await getTranslations('home');

  return (
    <>
      {/* Without JS the reveal targets would never get `.is-in` and would stay
          invisible. Unhide them up front instead. */}
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: '[data-reveal]{opacity:1 !important;transform:none !important}',
          }}
        />
      </noscript>

      <LandingNav isAuthenticated={isAuthenticated} />

      <main className="lp">
        {/* ── Hero: what this is, in one sentence, and one button ── */}
        <section className="lp-hero">
          <div className="lp-glow" aria-hidden="true" />
          <p className="lp-badge">{t('hero.badge')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="lp-lead">{t('hero.sub')}</p>
          <div className="lp-actions">
            <Link href={REGISTER} className="btn btn-primary">
              {t('hero.primary')}
            </Link>
            <Link href={SIGN_IN} className="btn btn-ghost">
              {t('hero.secondary')}
            </Link>
          </div>
          <p className="lp-note">{t('hero.note')}</p>
        </section>

        {/* ── What you can do: three cards, each one a link to sign-up ── */}
        <section className="lp-section">
          <header className="lp-head" data-reveal>
            <h2>{t('what.title')}</h2>
            <p>{t('what.sub')}</p>
          </header>
          <div className="lp-cards">
            {CARDS.map((key, i) => (
              <Link key={key} href={REGISTER} className="lp-card" data-reveal style={stagger(i)}>
                <h3>{t(`what.${key}.title`)}</h3>
                <p>{t(`what.${key}.body`)}</p>
                <span className="lp-card-go">
                  {t('what.link')} <span className="lp-arrow">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── How it works: three steps ── */}
        <section className="lp-section lp-section-alt">
          <header className="lp-head" data-reveal>
            <h2>{t('steps.title')}</h2>
            <p>{t('steps.sub')}</p>
          </header>
          <ol className="lp-steps">
            {STEPS.map((key, i) => (
              <li key={key} className="lp-step" data-reveal style={stagger(i)}>
                <span className="lp-step-n">{t(`steps.${key}.n`)}</span>
                <h3>{t(`steps.${key}.title`)}</h3>
                <p>{t(`steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Pricing: one line per plan, every button lands on sign-up ── */}
        <section className="lp-section">
          <header className="lp-head" data-reveal>
            <h2>{t('plans.title')}</h2>
            <p>{t('plans.sub')}</p>
          </header>
          <div className="lp-plans">
            {PLANS.map((plan, i) => (
              <div
                key={plan}
                className={`lp-plan${plan === 'pro' ? ' lp-plan-featured' : ''}`}
                data-reveal
                style={stagger(i)}
              >
                {plan === 'pro' && <span className="lp-plan-badge">{t('plans.pro.badge')}</span>}
                <h3>{t(`plans.${plan}.name`)}</h3>
                <p className="lp-plan-price">
                  {t(`plans.${plan}.price`)}
                  <span> {t(`plans.${plan}.per`)}</span>
                </p>
                <p className="lp-plan-body">{t(`plans.${plan}.body`)}</p>
                <Link
                  href={REGISTER}
                  className={`btn ${plan === 'pro' ? 'btn-primary' : 'btn-ghost'} btn-block`}
                >
                  {t(`plans.${plan}.btn`)}
                </Link>
              </div>
            ))}
          </div>
          <p className="lp-note lp-note-center">{t('plans.note')}</p>
        </section>

        {/* ── Custom builds / partnerships, kept to one paragraph ── */}
        <section className="lp-section lp-section-alt">
          <div className="lp-custom" data-reveal>
            <h2>{t('custom.title')}</h2>
            <p>{t('custom.body')}</p>
            <Link href={REGISTER} className="btn btn-ghost">
              {t('custom.btn')}
            </Link>
          </div>
        </section>

        {/* ── Closing call to action ── */}
        <section className="lp-cta" data-reveal>
          <h2>{t('cta.title')}</h2>
          <p>{t('cta.body')}</p>
          <div className="lp-actions lp-actions-center">
            <Link href={REGISTER} className="btn btn-primary">
              {t('cta.primary')}
            </Link>
            <Link href={SIGN_IN} className="btn btn-ghost">
              {t('cta.secondary')}
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
      <RevealOnScroll />
    </>
  );
}
