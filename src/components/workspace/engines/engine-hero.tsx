import type { Route } from 'next';
import { Link } from '@/i18n/routing';

// Top hero for the engines hub. Glassy panel, lime primary CTA. The secondary
// CTA jumps straight into NexoClip (the ready-now engine) so a new user always
// has a one-click path to value. Presentational only — rendered inside the
// client explorer but holds no state itself.

export function EngineHero({ liveCount }: { liveCount: number }) {
  return (
    <section className="relative overflow-hidden rounded-[16px] border border-[var(--cc-line)] bg-[var(--cc-panel)]/70 p-6 backdrop-blur-xl sm:p-8">
      {/* subtle brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-[var(--cc-green-g)] blur-3xl"
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--cc-green)]/30 bg-[var(--cc-green-g)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--cc-green)]">
            <span className="size-1.5 rounded-full bg-[var(--cc-green)]" />
            {liveCount > 0 ? `${liveCount} en vivo ahora` : 'Tu hub de engines'}
          </span>
          <h1
            className="mt-3 text-[clamp(26px,4vw,40px)] font-bold leading-[1.05] tracking-tight text-[var(--cc-txt)]"
            style={{ fontFamily: 'var(--cc-disp), sans-serif' }}
          >
            Elige tu engine
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--cc-txt-2)]">
            Cada engine automatiza un flujo de trabajo distinto — clips, streaming, trading y más.
            Pruébalos en simulación y actívalos en vivo cuando estés listo.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Link
            href={'/app/subscription' as Route}
            className="rounded-xl bg-[var(--cc-green)] px-5 py-2.5 text-[13.5px] font-bold text-[#070809] transition-[filter] hover:brightness-110"
          >
            Actualizar a Pro
          </Link>
          <Link
            href={'/app/engines/nexoclip' as Route}
            className="rounded-xl border border-[var(--cc-line-2)] bg-white/[0.02] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--cc-txt)] backdrop-blur transition-colors hover:border-[var(--cc-green)]/40 hover:text-[var(--cc-green)]"
          >
            Ver demo de NexoClip
          </Link>
        </div>
      </div>
    </section>
  );
}
