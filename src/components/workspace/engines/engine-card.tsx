'use client';

import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { LiveEngineSelectButton } from '@/components/workspace/live-engine-selector';
import type { EngineVM, EngineLiveState } from './engine-config';

// One engine tile. A single prominent status badge per card keeps the hierarchy
// clean (the old design stacked "Simulación" + "Requiere Pro" + "Partner" and
// they competed). Locked engines get a premium upgrade CTA, never a disabled
// look. NexoClip (vm.featured) renders larger with a "Disponible ahora" ribbon.

const STATUS: Record<
  EngineLiveState,
  { label: string; dot?: boolean; cls: string }
> = {
  live: {
    label: 'En vivo',
    dot: true,
    cls: 'text-[var(--cc-green)] border-[var(--cc-green)]/40 bg-[var(--cc-green-g)]',
  },
  trial: {
    label: 'Prueba en vivo',
    dot: true,
    cls: 'text-[var(--cc-cyan)] border-[var(--cc-cyan)]/40 bg-[var(--cc-cyan-g)]',
  },
  simulation: {
    label: 'Simulación',
    cls: 'text-[var(--cc-txt-3)] border-[var(--cc-line-2)] bg-white/[0.02]',
  },
  locked: {
    label: 'Requiere plan',
    cls: 'text-[var(--cc-amber)] border-[var(--cc-amber)]/40 bg-[var(--cc-amber-g)]',
  },
  coming_soon: {
    label: 'Próximamente',
    cls: 'text-[var(--cc-amber)] border-[var(--cc-amber)]/30 bg-[var(--cc-amber-g)]',
  },
};

function StatusBadge({ vm }: { vm: EngineVM }) {
  const s = STATUS[vm.state];
  const label = vm.state === 'locked' && vm.requiresPlanLabel ? `Requiere ${vm.requiresPlanLabel}` : s.label;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}
    >
      {s.dot && <span className="size-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12.5px] leading-snug text-[var(--cc-txt-2)]">
      <span className="mt-px shrink-0 text-[var(--cc-green)]">✓</span>
      <span className="line-clamp-1">{children}</span>
    </li>
  );
}

export function EngineCard({ vm }: { vm: EngineVM }) {
  const href = `/app/engines/${vm.slug}` as Route;
  const isComingSoon = vm.state === 'coming_soon';
  const isLocked = vm.state === 'locked';
  const isLiveish = vm.state === 'live' || vm.state === 'trial';

  return (
    <article
      className={[
        'group relative flex flex-col overflow-hidden rounded-[13px] border p-5 transition-all duration-200',
        'hover:-translate-y-0.5',
        vm.featured
          ? 'border-[var(--cc-green)]/55 bg-[linear-gradient(150deg,var(--cc-green-g),transparent_55%)] shadow-[0_18px_50px_-22px_var(--cc-green-g)]'
          : isLiveish
            ? 'border-[var(--cc-green)]/30 bg-[var(--cc-panel)] hover:border-[var(--cc-green)]/55'
            : 'border-[var(--cc-line)] bg-[var(--cc-panel)] hover:border-[var(--cc-line-2)]',
        isComingSoon ? 'opacity-80' : '',
      ].join(' ')}
    >
      {/* "Disponible ahora" ribbon — only when the featured engine is actually
          usable. A locked featured card stays the headline but shows its real
          status badge instead of a misleading "available now" ribbon. */}
      {vm.featured && !isLocked && (
        <span className="absolute right-0 top-0 rounded-bl-lg bg-[var(--cc-green)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#070809]">
          Disponible ahora
        </span>
      )}

      {/* Head: icon + name + category, with the single status badge */}
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid shrink-0 place-items-center rounded-xl border border-[var(--cc-line-2)] bg-[var(--cc-bg-2)] ${
              vm.featured ? 'size-14 text-3xl' : 'size-12 text-2xl'
            }`}
            aria-hidden
          >
            {vm.icon}
          </span>
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
        {(!vm.featured || isLocked) && <StatusBadge vm={vm} />}
      </header>

      {/* Value prop — one line */}
      <p
        className={`mt-3 line-clamp-2 text-[13px] leading-relaxed text-[var(--cc-txt-2)] ${
          vm.featured ? 'max-w-[42ch]' : ''
        }`}
      >
        {vm.tagline}
      </p>

      {/* Up to 3 compact bullets */}
      <ul className="mt-3 flex flex-col gap-1.5">
        {vm.bullets.slice(0, 3).map((b) => (
          <Bullet key={b}>{b}</Bullet>
        ))}
      </ul>

      {/* Footer: env/region + owner on the left, CTA on the right */}
      <footer className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--cc-line-soft)] pt-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2 text-[10.5px] text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
            <span>{vm.envLabel}</span>
            <span className="opacity-40">·</span>
            <span className="truncate">{vm.region}</span>
          </div>
          <span
            className={`text-[10px] uppercase tracking-wider [font-family:var(--cc-mono),monospace] ${
              vm.isPlatformOwned ? 'text-[var(--cc-txt-4)]' : 'text-[var(--cc-purple)]'
            }`}
            title={`Engine creado por ${vm.ownerLabel}${vm.isOwnedByMe ? ' (tú)' : ''}`}
          >
            {vm.isOwnedByMe ? 'Tu engine' : `by ${vm.ownerLabel}`}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {vm.canSelectLive && (
            <LiveEngineSelectButton
              engineId={vm.id}
              engineName={vm.name}
              isCurrentlySelected={vm.isSelectedLive}
            />
          )}
          {isComingSoon ? (
            <Link
              href={href}
              className="rounded-lg border border-[var(--cc-line-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--cc-txt-3)] transition-colors hover:text-[var(--cc-txt)]"
            >
              Ver detalles
            </Link>
          ) : isLocked ? (
            <Link
              href={'/app/subscription' as Route}
              className="rounded-lg border border-[var(--cc-amber)]/45 bg-[var(--cc-amber-g)] px-3 py-1.5 text-[12px] font-semibold text-[var(--cc-amber)] transition-colors hover:bg-[var(--cc-amber)]/20"
            >
              Desbloquear →
            </Link>
          ) : (
            <Link
              href={href}
              className={
                vm.featured || isLiveish
                  ? 'rounded-lg bg-[var(--cc-green)] px-3.5 py-1.5 text-[12px] font-bold text-[#070809] transition-[filter] hover:brightness-110'
                  : 'rounded-lg border border-[var(--cc-green)]/40 px-3 py-1.5 text-[12px] font-semibold text-[var(--cc-green)] transition-colors hover:bg-[var(--cc-green-g)]'
              }
            >
              {vm.featured ? `Abrir ${vm.name} →` : 'Abrir engine →'}
            </Link>
          )}
        </div>
      </footer>
    </article>
  );
}
