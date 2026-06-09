'use client';

import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Pro upsell that sits at the HEAD of the "Desbloueá con Pro" section — next to
// the engines it unlocks, not competing with the primary action in the hero.
// Shown for FREE users only (PRO/VIP already have live access).

export function UpgradeBanner() {
  const t = useTranslations('engines.upsell');
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-[var(--cc-amber)]/25 bg-[linear-gradient(110deg,var(--cc-amber-g),transparent_60%)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex items-center gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-[var(--cc-amber)]/30 bg-[var(--cc-bg-2)] text-lg"
          aria-hidden
        >
          ⚡
        </span>
        <div>
          <div className="text-[13.5px] font-semibold text-[var(--cc-txt)]">{t('title')}</div>
          <div className="text-[12.5px] text-[var(--cc-txt-2)]">{t('sub')}</div>
        </div>
      </div>
      <Link
        href={'/app/subscription' as Route}
        className="shrink-0 rounded-lg border border-[var(--cc-amber)]/45 bg-[var(--cc-amber-g)] px-4 py-2 text-[12.5px] font-bold text-[var(--cc-amber)] transition-colors hover:bg-[var(--cc-amber)]/20"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
