'use client';

import { useMemo, useState } from 'react';
import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import {
  ENGINE_FILTER_KEYS,
  sectionFor,
  type EngineFilterKey,
  type EngineVM,
} from './engine-config';
import { EngineFilters } from './engine-filters';
import { EngineCard } from './engine-card';

// Client island for the engines hub. Owns the filter state; all auth, tier and
// live-gating already happened on the server and arrives baked into each
// EngineVM.
//
// The old hub stacked a page title, a tier badge, a full-width hero, filter
// tabs, and then three separately-headed sections — the first engine sat
// roughly a screen down. Now: one optional "pick up where you left off" line,
// the filters, and one grid, ordered so what you can use right now comes
// first.

const SECTION_RANK = { available: 0, pro: 1, soon: 2 } as const;

export function EnginesExplorer({
  engines,
  continueEngine,
  showUpsell,
}: {
  engines: EngineVM[];
  continueEngine: { name: string; slug: string } | null;
  showUpsell: boolean;
}) {
  const t = useTranslations('engines');
  const [filter, setFilter] = useState<EngineFilterKey>('all');

  const counts = useMemo(() => {
    const c = Object.fromEntries(ENGINE_FILTER_KEYS.map((k) => [k, 0])) as Record<
      EngineFilterKey,
      number
    >;
    for (const e of engines) for (const k of e.filterKeys) c[k] += 1;
    return c;
  }, [engines]);

  // Usable now first, then plan-gated, then unreleased — a stable sort, so the
  // catalog's own order survives inside each bucket.
  const visible = useMemo(
    () =>
      engines
        .filter((e) => e.filterKeys.includes(filter))
        .sort((a, b) => SECTION_RANK[sectionFor(a.state)] - SECTION_RANK[sectionFor(b.state)]),
    [engines, filter],
  );

  return (
    <>
      {continueEngine && (
        <div className="ws-notice accent ws-enter">
          <div className="ws-notice-body">
            <h3>{t('hero.headingContinue')}</h3>
            <p>{t('hero.subContinue', { name: continueEngine.name })}</p>
          </div>
          <Link
            href={`/app/engines/${continueEngine.slug}` as Route}
            className="ws-btn ws-btn-primary ws-btn-sm"
          >
            {t('hero.ctaContinue')}
          </Link>
        </div>
      )}

      {showUpsell && (
        <div className="ws-notice ws-enter">
          <div className="ws-notice-body">
            <h3>{t('upsell.title')}</h3>
            <p>{t('upsell.sub')}</p>
          </div>
          <Link href={'/app/subscription' as Route} className="ws-btn ws-btn-ghost ws-btn-sm">
            {t('upsell.cta')}
          </Link>
        </div>
      )}

      <section className="ws-section">
        <EngineFilters active={filter} counts={counts} onChange={setFilter} />
      </section>

      {visible.length === 0 ? (
        <div className="ws-empty">
          <h3>{t('filters.emptyTitle')}</h3>
          <button type="button" className="ws-btn ws-btn-ghost" onClick={() => setFilter('all')}>
            {t('filters.emptyCta')}
          </button>
        </div>
      ) : (
        <div className="ws-grid ws-grid-3">
          {visible.map((vm, i) => (
            <div key={vm.id} className="ws-cell ws-enter" style={{ '--i': i + 1 } as React.CSSProperties}>
              <EngineCard vm={vm} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
