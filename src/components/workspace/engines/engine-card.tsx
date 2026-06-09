'use client';

import type { Route } from 'next';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useWorkspace } from '@/lib/workspace/store';
import { LiveEngineSelectButton } from '@/components/workspace/live-engine-selector';
import { EngineGlyph } from './engine-glyph';
import type { EngineVM, EngineCardVariant } from './engine-config';

// Near-black ink for solid brand-green buttons — set inline so it always wins
// over inherited light page text.
const INK = '#0a0c0e';

// One engine tile in four variants so the three actionability states read
// differently at a glance:
//   featured  — NexoClip, dominant wide card: content left, CTA right.
//   available — usable now (live/sim): tagline only.
//   locked    — Pro-gated: muted, lock next to the Pro pill, outline upgrade CTA.
//   soon      — coming-soon: dimmed compact ROW, ghost "Avísame".
// No env/region anywhere — that's dev-only and never shown to users.

function StatusBadge({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  const map = {
    live: { label: t('statusLive'), dot: true, lock: false, cls: 'text-[var(--cc-green)] border-[var(--cc-green)]/40 bg-[var(--cc-green-g)]' },
    trial: { label: t('statusTrial'), dot: true, lock: false, cls: 'text-[var(--cc-cyan)] border-[var(--cc-cyan)]/40 bg-[var(--cc-cyan-g)]' },
    simulation: { label: t('statusSimulation'), dot: false, lock: false, cls: 'text-[var(--cc-txt-3)] border-[var(--cc-line-2)] bg-white/[0.02]' },
    // Lock sits inside the pill (top-right corner of the card) — never over the icon.
    locked: { label: vm.requiresPlanLabel ?? 'Pro', dot: false, lock: true, cls: 'text-[var(--cc-purple)] border-[var(--cc-purple)]/40 bg-[var(--cc-purple-g)]' },
    coming_soon: { label: t('statusSoon'), dot: false, lock: false, cls: 'text-[var(--cc-purple)] border-[var(--cc-purple)]/30 bg-[var(--cc-purple-g)]' },
  } as const;
  const s = map[vm.state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>
      {s.dot && <span className="size-1.5 rounded-full bg-current" />}
      {s.lock && <Lock size={11} strokeWidth={2.25} />}
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
      className={`truncate text-[10px] uppercase tracking-wider [font-family:var(--cc-mono),monospace] ${
        vm.isPlatformOwned ? 'text-[var(--cc-txt-4)]' : 'text-[var(--cc-purple)]'
      }`}
    >
      {label}
    </span>
  );
}

// Icon tile — lucide glyph tinted per state, centered in a bordered tile.
function EngineIcon({ vm, variant, box, glyph }: { vm: EngineVM; variant: EngineCardVariant; box: string; glyph: number }) {
  const tint =
    variant === 'locked'
      ? 'border-[var(--cc-purple)]/30 bg-[var(--cc-purple-g)] text-[var(--cc-purple)]'
      : variant === 'soon'
        ? 'border-[var(--cc-line-2)] bg-[var(--cc-bg-2)] text-[var(--cc-txt-4)]'
        : 'border-[var(--cc-green)]/30 bg-[var(--cc-green-g)] text-[var(--cc-green)]';
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border ${tint} ${box}`}>
      <EngineGlyph slug={vm.slug} size={glyph} />
    </span>
  );
}

function Checkmarks({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-2">
      {bullets.slice(0, 3).map((b) => (
        <li key={b} className="flex items-start gap-2 text-[13px] leading-relaxed text-[var(--cc-txt-2)]">
          <span className="mt-0.5 shrink-0 text-[var(--cc-green)]">✓</span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Coming-soon: compact row ───────────────────────────────────────────────
function SoonRow({ vm }: { vm: EngineVM }) {
  const t = useTranslations('engines.card');
  const showToast = useWorkspace((s) => s.showToast);
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--cc-line)] bg-[var(--cc-panel)]/60 p-4 opacity-70 transition-opacity hover:opacity-100">
      <EngineIcon vm={vm} variant="soon" box="size-11" glyph={22} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-[var(--cc-txt-2)]">{vm.name}</div>
        <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
          {vm.categoryLabel}
        </div>
      </div>
      <button
        type="button"
        onClick={() => showToast(t('notifyDone', { name: vm.name }))}
        className="shrink-0 rounded-lg border border-[var(--cc-line-2)] px-3.5 py-1.5 text-[11.5px] font-medium text-[var(--cc-txt-4)] transition-colors hover:text-[var(--cc-txt-2)]"
      >
        {t('notify')}
      </button>
    </div>
  );
}

// ── Featured: wide card, content left / CTA right ──────────────────────────
function FeaturedCard({ vm, href }: { vm: EngineVM; href: Route }) {
  const t = useTranslations('engines.card');
  return (
    <article className="relative flex flex-col gap-6 rounded-xl border border-[var(--cc-green)]/55 bg-[linear-gradient(150deg,var(--cc-green-g),transparent_55%)] p-8 shadow-[0_18px_50px_-22px_var(--cc-green-g)] md:flex-row md:items-center md:justify-between">
      {/* LEFT */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-4">
          <EngineIcon vm={vm} variant="featured" box="size-16" glyph={34} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-[18px] font-bold tracking-tight text-[var(--cc-txt)]" style={{ fontFamily: 'var(--cc-disp), sans-serif' }}>
                {vm.name}
              </h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cc-green)]/40 bg-[var(--cc-green-g)] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--cc-green)]">
                <span className="size-1.5 rounded-full bg-[var(--cc-green)]" />
                {t('ribbon')}
              </span>
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wider text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
              {vm.categoryLabel}
            </div>
          </div>
        </div>
        <p className="mt-4 max-w-prose text-[13.5px] leading-relaxed text-[var(--cc-txt-2)]">{vm.tagline}</p>
        {vm.bullets.length > 0 && (
          <div className="mt-4">
            <Checkmarks bullets={vm.bullets} />
          </div>
        )}
      </div>

      {/* RIGHT — button vertically centered, never overlapping */}
      <div className="shrink-0 md:pl-6">
        <Link
          href={href}
          style={{ color: INK }}
          className="inline-flex rounded-lg bg-[var(--cc-green)] px-5 py-2.5 text-[13.5px] font-bold transition-[filter] hover:brightness-110"
        >
          {t('openNamed', { name: vm.name })}
        </Link>
      </div>
    </article>
  );
}

export function EngineCard({ vm, variant }: { vm: EngineVM; variant: EngineCardVariant }) {
  const t = useTranslations('engines.card');
  const href = `/app/engines/${vm.slug}` as Route;

  if (variant === 'soon') return <SoonRow vm={vm} />;
  if (variant === 'featured') return <FeaturedCard vm={vm} href={href} />;

  const isLocked = variant === 'locked';
  const showBullets = !isLocked && vm.bullets.length > 0;

  return (
    <article
      className={[
        'group relative flex h-full flex-col rounded-xl border p-6 transition-all duration-200 hover:-translate-y-0.5',
        isLocked
          ? 'border-[var(--cc-line)] bg-[var(--cc-panel)]/70 opacity-90 hover:opacity-100'
          : 'border-[var(--cc-green)]/25 bg-[var(--cc-panel)] hover:border-[var(--cc-green)]/45',
      ].join(' ')}
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <EngineIcon vm={vm} variant={variant} box="size-14" glyph={28} />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold text-[var(--cc-txt)]" style={{ fontFamily: 'var(--cc-disp), sans-serif' }}>
              {vm.name}
            </h3>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
              {vm.categoryLabel}
            </div>
          </div>
        </div>
        <StatusBadge vm={vm} />
      </header>

      <p className="mt-4 line-clamp-2 max-w-prose text-[13px] leading-relaxed text-[var(--cc-txt-2)]">{vm.tagline}</p>

      {showBullets && (
        <div className="mt-4">
          <Checkmarks bullets={vm.bullets} />
        </div>
      )}

      <footer className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--cc-line-soft)] pt-4">
        {!isLocked ? (
          <span className="min-w-0 flex-1">
            <OwnerCaption vm={vm} />
          </span>
        ) : (
          <span className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-2">
          {vm.canSelectLive && (
            <LiveEngineSelectButton engineId={vm.id} engineName={vm.name} isCurrentlySelected={vm.isSelectedLive} />
          )}
          {isLocked ? (
            <Link
              href={'/app/subscription' as Route}
              className="rounded-lg border border-[var(--cc-purple)]/45 bg-[var(--cc-purple-g)] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--cc-purple)] transition-colors hover:bg-[var(--cc-purple)]/20"
            >
              {t('unlock')}
            </Link>
          ) : (
            <Link
              href={href}
              className="rounded-lg border border-[var(--cc-green)]/40 px-3.5 py-2 text-[12.5px] font-semibold text-[var(--cc-green)] transition-colors hover:bg-[var(--cc-green-g)]"
            >
              {t('open')}
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
