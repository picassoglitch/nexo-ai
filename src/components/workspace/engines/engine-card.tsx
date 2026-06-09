'use client';

import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useWorkspace } from '@/lib/workspace/store';
import { LiveEngineSelectButton } from '@/components/workspace/live-engine-selector';
import type { EngineVM, EngineCardVariant } from './engine-config';

// One engine tile, rendered in one of four variants so the three actionability
// states read differently at a glance:
//   featured  — NexoClip, dominant: full color, lime glow, ribbon, bullets.
//   available — usable now (live/sim): full color, no glow, tagline only.
//   locked    — Pro-gated: muted, lock affordance, one-line, outline upgrade CTA.
//   soon      — coming-soon: dimmed compact ROW, just icon+name+category, ghost
//               "Avísame" (no checklist, no infra metadata).
// No env/region anywhere — that's dev-only and never shown to users.

function StatusBadge({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  const map = {
    live: { label: t('statusLive'), dot: true, cls: 'text-[var(--cc-green)] border-[var(--cc-green)]/40 bg-[var(--cc-green-g)]' },
    trial: { label: t('statusTrial'), dot: true, cls: 'text-[var(--cc-cyan)] border-[var(--cc-cyan)]/40 bg-[var(--cc-cyan-g)]' },
    simulation: { label: t('statusSimulation'), dot: false, cls: 'text-[var(--cc-txt-3)] border-[var(--cc-line-2)] bg-white/[0.02]' },
    locked: { label: t('statusLocked', { plan: vm.requiresPlanLabel ?? 'Pro' }), dot: false, cls: 'text-[var(--cc-amber)] border-[var(--cc-amber)]/40 bg-[var(--cc-amber-g)]' },
    coming_soon: { label: t('statusSoon'), dot: false, cls: 'text-[var(--cc-amber)] border-[var(--cc-amber)]/30 bg-[var(--cc-amber-g)]' },
  } as const;
  const s = map[vm.state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      {s.dot && <span className="size-1.5 rounded-full bg-current" />}
      {s.label}
    </span>
  );
}

function OwnerCaption({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  const label = vm.isOwnedByMe
    ? t('ownerMine')
    : vm.isPlatformOwned
      ? t('ownerNexo')
      : t('ownerBy', { owner: vm.ownerLabel });
  return (
    <span
      className={`text-[10px] uppercase tracking-wider [font-family:var(--cc-mono),monospace] ${
        vm.isPlatformOwned ? 'text-[var(--cc-txt-4)]' : 'text-[var(--cc-purple)]'
      }`}
    >
      {label}
    </span>
  );
}

function EngineIcon({ vm, size, dimmed }: { vm: EngineVM; size: string; dimmed?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl border border-[var(--cc-line-2)] bg-[var(--cc-bg-2)] ${size} ${
        dimmed ? 'opacity-60 grayscale' : ''
      }`}
      aria-hidden
    >
      {vm.icon}
    </span>
  );
}

// ── Coming-soon: compact row ───────────────────────────────────────────────
function SoonRow({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  const showToast = useWorkspace((s) => s.showToast);
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-[var(--cc-line)] bg-[var(--cc-panel)]/60 px-3.5 py-2.5 opacity-70 transition-opacity hover:opacity-100">
      <EngineIcon vm={vm} size="size-9 text-lg" dimmed />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[var(--cc-txt-2)]">{vm.name}</div>
        <div className="text-[10.5px] uppercase tracking-wider text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
          {vm.categoryLabel}
        </div>
      </div>
      <button
        type="button"
        onClick={() => showToast(t('notifyDone', { name: vm.name }))}
        className="shrink-0 rounded-lg border border-[var(--cc-line-2)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--cc-txt-4)] transition-colors hover:border-[var(--cc-line-2)] hover:text-[var(--cc-txt-2)]"
      >
        {t('notify')}
      </button>
    </div>
  );
}

export function EngineCard({ vm, variant }: { vm: EngineVM; variant: EngineCardVariant }) {
  const t = useTranslations('engines.card');
  const href = `/app/engines/${vm.slug}` as Route;

  if (variant === 'soon') return <SoonRow vm={vm} />;

  const isFeatured = variant === 'featured';
  const isLocked = variant === 'locked';
  const showBullets = (isFeatured || variant === 'available') && vm.bullets.length > 0;

  return (
    <article
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-[13px] border p-5 transition-all duration-200 hover:-translate-y-0.5',
        isFeatured
          ? 'border-[var(--cc-green)]/55 bg-[linear-gradient(150deg,var(--cc-green-g),transparent_55%)] shadow-[0_18px_50px_-22px_var(--cc-green-g)]'
          : isLocked
            ? 'border-[var(--cc-line)] bg-[var(--cc-panel)]/70 opacity-90 hover:opacity-100'
            : 'border-[var(--cc-green)]/25 bg-[var(--cc-panel)] hover:border-[var(--cc-green)]/45',
      ].join(' ')}
    >
      {isFeatured && (
        <span className="absolute right-0 top-0 rounded-bl-lg bg-[var(--cc-green)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#070809]">
          {t('ribbon')}
        </span>
      )}

      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <EngineIcon vm={vm} size={isFeatured ? 'size-14 text-3xl' : 'size-12 text-2xl'} dimmed={isLocked} />
            {isLocked && (
              <span
                className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border border-[var(--cc-amber)]/40 bg-[var(--cc-bg-1)] text-[10px]"
                aria-hidden
              >
                🔒
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3
              className="truncate text-[15px] font-bold text-[var(--cc-txt)]"
              style={{ fontFamily: 'var(--cc-disp), sans-serif' }}
            >
              {vm.name}
            </h3>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
              {vm.categoryLabel}
            </div>
          </div>
        </div>
        {/* Featured engine doesn't need a status badge — the ribbon says it all. */}
        {!isFeatured && <StatusBadge vm={vm} />}
      </header>

      <p className={`mt-3 text-[13px] leading-relaxed text-[var(--cc-txt-2)] ${isFeatured ? 'max-w-[42ch]' : 'line-clamp-2'}`}>
        {vm.tagline}
      </p>

      {showBullets && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {vm.bullets.slice(0, 3).map((b) => (
            <li key={b} className="flex items-start gap-2 text-[12.5px] leading-snug text-[var(--cc-txt-2)]">
              <span className="mt-px shrink-0 text-[var(--cc-green)]">✓</span>
              <span className="line-clamp-1">{b}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--cc-line-soft)] pt-3">
        {!isLocked ? <OwnerCaption vm={vm} /> : <span className="text-[10px] text-[var(--cc-txt-4)]" />}

        <div className="flex shrink-0 items-center gap-2">
          {vm.canSelectLive && (
            <LiveEngineSelectButton
              engineId={vm.id}
              engineName={vm.name}
              isCurrentlySelected={vm.isSelectedLive}
            />
          )}
          {isLocked ? (
            <Link
              href={'/app/subscription' as Route}
              className="rounded-lg border border-[var(--cc-amber)]/45 bg-[var(--cc-amber-g)] px-3 py-1.5 text-[12px] font-semibold text-[var(--cc-amber)] transition-colors hover:bg-[var(--cc-amber)]/20"
            >
              {t('unlock')}
            </Link>
          ) : (
            <Link
              href={href}
              className={
                isFeatured
                  ? 'rounded-lg bg-[var(--cc-green)] px-3.5 py-1.5 text-[12px] font-bold text-[#070809] transition-[filter] hover:brightness-110'
                  : 'rounded-lg border border-[var(--cc-green)]/40 px-3 py-1.5 text-[12px] font-semibold text-[var(--cc-green)] transition-colors hover:bg-[var(--cc-green-g)]'
              }
            >
              {isFeatured ? t('openNamed', { name: vm.name }) : t('open')}
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
