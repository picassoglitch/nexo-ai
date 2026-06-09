'use client';

import { useMemo, useState } from 'react';
import { ENGINE_FILTERS, type EngineFilterKey, type EngineVM } from './engine-config';
import { EngineHero } from './engine-hero';
import { UpgradeBanner } from './upgrade-banner';
import { EngineFilters } from './engine-filters';
import { EngineCard } from './engine-card';

// Client island for the engines hub. Owns only the filter-tab state; all auth,
// tier, and live-gating decisions already happened on the server and arrive
// baked into each EngineVM. Featured (NexoClip) spans two columns so it reads
// as the headline, ready-now engine.

export function EnginesExplorer({
  engines,
  liveCount,
  showOnboarding,
}: {
  engines: EngineVM[];
  liveCount: number;
  showOnboarding: boolean;
}) {
  const [filter, setFilter] = useState<EngineFilterKey>('all');

  const counts = useMemo(() => {
    const c = Object.fromEntries(ENGINE_FILTERS.map((f) => [f.key, 0])) as Record<
      EngineFilterKey,
      number
    >;
    for (const e of engines) for (const k of e.filterKeys) c[k] += 1;
    return c;
  }, [engines]);

  const visible = useMemo(
    () => engines.filter((e) => e.filterKeys.includes(filter)),
    [engines, filter],
  );

  return (
    <div className="flex flex-col gap-6 pb-2">
      <EngineHero liveCount={liveCount} />

      {showOnboarding && <UpgradeBanner />}

      <div className="flex flex-col gap-4">
        <EngineFilters active={filter} counts={counts} onChange={setFilter} />

        {visible.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--cc-line-2)] p-12 text-center">
            <div className="text-[14px] font-semibold text-[var(--cc-txt-2)]">
              No hay engines en este filtro
            </div>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-3 rounded-lg border border-[var(--cc-line-2)] px-4 py-1.5 text-[12.5px] font-semibold text-[var(--cc-txt-3)] transition-colors hover:text-[var(--cc-txt)]"
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((vm) => (
              <div key={vm.id} className={vm.featured ? 'sm:col-span-2' : ''}>
                <EngineCard vm={vm} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
