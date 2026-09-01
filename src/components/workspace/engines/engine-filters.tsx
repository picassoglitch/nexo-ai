'use client';

import { useTranslations } from 'next-intl';
import { ENGINE_FILTER_KEYS, type EngineFilterKey } from './engine-config';

// Filter chips above the grid, with a live count per bucket so empty filters
// are obvious before you click. Scrolls sideways on narrow screens rather than
// wrapping into a tall block.
export function EngineFilters({
  active,
  counts,
  onChange,
}: {
  active: EngineFilterKey;
  counts: Record<EngineFilterKey, number>;
  onChange: (key: EngineFilterKey) => void;
}) {
  const t = useTranslations('engines.filters');
  return (
    <div className="ws-chips" role="tablist" aria-label={t('aria')}>
      {ENGINE_FILTER_KEYS.map((key) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={`ws-filter${isActive ? ' on' : ''}`}
          >
            {t(key)}
            <span className="ws-filter-ct">{counts[key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
