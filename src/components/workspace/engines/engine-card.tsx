'use client';

import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useWorkspace } from '@/lib/workspace/store';
import { LiveEngineSelectButton } from '@/components/workspace/live-engine-selector';
import { EngineGlyph } from './engine-glyph';
import type { EngineVM } from './engine-config';

// ONE engine card. The hub used to render four different shapes — a full-width
// "featured" hero, a normal tile, a locked tile and a compact "soon" row — so
// scanning the grid meant re-learning the layout every few cards. Now every
// engine is the same object; state is carried by the badge and by which single
// action the footer offers.

function StatusBadge({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  switch (vm.state) {
    case 'live':
      return (
        <span className="ws-badge live">
          <span className="ws-pulse" />
          {t('statusLive')}
        </span>
      );
    case 'trial':
      return (
        <span className="ws-badge live">
          <span className="ws-pulse" />
          {t('statusTrial')}
        </span>
      );
    case 'locked':
      return (
        <span className="ws-badge soon">
          <Lock size={11} strokeWidth={2.25} />
          {vm.requiresPlanLabel ?? 'Pro'}
        </span>
      );
    case 'coming_soon':
      return <span className="ws-badge soon">{t('statusSoon')}</span>;
    default:
      return <span className="ws-badge">{t('statusSimulation')}</span>;
  }
}

export function EngineCard({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  const showToast = useWorkspace((s) => s.showToast);
  const href = `/app/engines/${vm.slug}` as Route;

  const isLocked = vm.state === 'locked';
  const isSoon = vm.state === 'coming_soon';
  const isLive = vm.state === 'live' || vm.state === 'trial';

  return (
    <article
      className={`ws-card ws-engine-card${isLive ? ' is-live' : ''}${isSoon ? ' is-soon' : ''}`}
    >
      <div className="ws-engine-top">
        <span className={`ws-engine-glyph${isLive ? ' is-live' : ''}`}>
          <EngineGlyph slug={vm.slug} size={22} />
        </span>
        <div className="ws-engine-id">
          <h3>{vm.name}</h3>
          <div className="ws-engine-type">{vm.categoryLabel}</div>
        </div>
        <StatusBadge vm={vm} />
      </div>

      <p className="ws-engine-tagline">{vm.tagline}</p>

      {/* Bullets are the sales pitch — pointless on something you can't reach
          yet, so locked and coming-soon cards drop them. */}
      {!isLocked && !isSoon && vm.bullets.length > 0 && (
        <ul className="ws-engine-bullets">
          {vm.bullets.slice(0, 3).map((b) => (
            <li key={b}>
              <span aria-hidden="true">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="ws-card-foot">
        <span className="ws-engine-owner">
          {vm.isOwnedByMe
            ? t('ownerMine')
            : vm.isPlatformOwned
              ? t('ownerNexo')
              : t('ownerBy', { owner: vm.ownerLabel })}
        </span>

        <div className="ws-btn-row">
          {vm.canSelectLive && (
            <LiveEngineSelectButton
              engineId={vm.id}
              engineName={vm.name}
              isCurrentlySelected={vm.isSelectedLive}
            />
          )}
          {isSoon ? (
            <button
              type="button"
              className="ws-btn ws-btn-ghost ws-btn-sm"
              onClick={() => showToast(t('notifyDone', { name: vm.name }))}
            >
              {t('notify')}
            </button>
          ) : isLocked ? (
            <Link href={'/app/subscription' as Route} className="ws-btn ws-btn-ghost ws-btn-sm">
              {t('unlock')}
            </Link>
          ) : (
            <Link
              href={href}
              className={`ws-btn ws-btn-sm ${isLive ? 'ws-btn-primary' : 'ws-btn-ghost'}`}
            >
              {t('open')}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
