'use client';

import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Single focused continuation hero. ONE primary action only:
//   - has a live/in-progress engine  → "Continuar →" resumes it (by name)
//   - otherwise                      → "Abrir NexoClip →" (the ready-now engine)
// Plus one low-emphasis "Ver demo" text link. The "Actualizar a Pro" upsell
// lives down in the Pro section now — it no longer competes with the primary
// action up here.

export function EngineHero({
  liveCount,
  continueEngine,
}: {
  liveCount: number;
  continueEngine: { name: string; slug: string } | null;
}) {
  const t = useTranslations('engines');
  const primaryHref = (
    continueEngine ? `/app/engines/${continueEngine.slug}` : '/app/engines/nexoclip'
  ) as Route;

  return (
    <section className="relative overflow-hidden rounded-[16px] border border-[var(--cc-line)] bg-[var(--cc-panel)]/70 p-6 backdrop-blur-xl sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[var(--cc-green-g)] blur-3xl"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--cc-green)]/30 bg-[var(--cc-green-g)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--cc-green)]">
            <span className="size-1.5 rounded-full bg-[var(--cc-green)]" />
            {liveCount > 0 ? t('hero.badgeLive', { count: liveCount }) : t('hero.badgeIdle')}
          </span>
          <h1
            className="mt-3 text-[clamp(24px,3.6vw,36px)] font-bold leading-[1.06] tracking-tight text-[var(--cc-txt)]"
            style={{ fontFamily: 'var(--cc-disp), sans-serif' }}
          >
            {continueEngine ? t('hero.headingContinue') : t('hero.headingStart')}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cc-txt-2)]">
            {continueEngine
              ? t('hero.subContinue', { name: continueEngine.name })
              : t('hero.subStart')}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2.5 sm:flex-row sm:items-center">
          <Link
            href={primaryHref}
            className="rounded-xl bg-[var(--cc-green)] px-5 py-2.5 text-[13.5px] font-bold text-[#070809] transition-[filter] hover:brightness-110"
          >
            {continueEngine ? t('hero.ctaContinue') : t('hero.ctaOpen')}
          </Link>
          <Link
            href={'/app/engines/nexoclip' as Route}
            className="px-1 text-[13px] font-medium text-[var(--cc-txt-3)] underline-offset-4 transition-colors hover:text-[var(--cc-txt)] hover:underline"
          >
            {t('hero.ctaDemo')}
          </Link>
        </div>
      </div>
    </section>
  );
}
