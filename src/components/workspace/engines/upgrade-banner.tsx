import type { Route } from 'next';
import { Link } from '@/i18n/routing';

// Slim onboarding strip pointing new/Free users at NexoClip — the engine
// that's usable right now. Shown above the grid for FREE users only (PRO/VIP
// already have live access, so the nudge would be noise for them).

export function UpgradeBanner() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-[var(--cc-cyan)]/25 bg-[linear-gradient(110deg,var(--cc-cyan-g),transparent_60%)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--cc-cyan)]/30 bg-[var(--cc-bg-2)] text-xl"
          aria-hidden
        >
          🎬
        </span>
        <div>
          <div className="text-[13.5px] font-semibold text-[var(--cc-txt)]">
            Empieza con NexoClip
          </div>
          <div className="text-[12.5px] text-[var(--cc-txt-2)]">
            Genera clips virales desde tus streams en minutos.
          </div>
        </div>
      </div>
      <Link
        href={'/app/engines/nexoclip' as Route}
        className="shrink-0 rounded-lg border border-[var(--cc-cyan)]/45 bg-[var(--cc-cyan-g)] px-4 py-2 text-[12.5px] font-bold text-[var(--cc-cyan)] transition-colors hover:bg-[var(--cc-cyan)]/20"
      >
        Probar NexoClip →
      </Link>
    </div>
  );
}
