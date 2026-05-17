import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { listEngines } from '@/lib/data/engines';

export const metadata = { title: 'Overview' };

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const engines = await listEngines();
  const active = engines.filter(
    (e) => e.status === 'active' && e.stateCode !== 'o' && e.stateCode !== 'r',
  ).length;
  const totalRev = engines.reduce((a, e) => a + e.revenueCents, 0);
  const errored = engines.filter((e) => e.stateCode === 'r').length;
  const comingSoon = engines.filter((e) => e.status === 'coming_soon').length;
  const personas = engines.filter((e) => e.persona).length;

  // Top by health for the "Top engines" list — falls back to revenue when
  // multiple engines are at the same health level. Filter out offline so the
  // list shows things you can actually look at.
  const topByHealth = [...engines]
    .filter((e) => e.status !== 'deprecated')
    .sort((a, b) => {
      if (b.health !== a.health) return b.health - a.health;
      return b.revenueCents - a.revenueCents;
    })
    .slice(0, 6);

  const needAttention = engines.filter((e) => e.stateCode === 'r' || e.stateCode === 'a');

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Engines activos</div>
          <div className="cc-mod-stat-v gr">
            {active}
            <small>/ {engines.length}</small>
          </div>
          <div className="cc-mod-stat-sub">
            {comingSoon} próximamente · {errored} con error
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Ingresos mes</div>
          <div className={`cc-mod-stat-v ${totalRev > 0 ? 'gr' : ''}`}>
            ${Math.round(totalRev / 100).toLocaleString()}
          </div>
          <div className="cc-mod-stat-sub">
            {totalRev > 0
              ? 'agregado por todos los engines'
              : 'sin ingresos registrados todavía'}
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Trabajos IA / día</div>
          <div className="cc-mod-stat-v cy">3.4k</div>
          <div className="cc-mod-stat-sub">+12% vs 7d</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Engines con persona IA</div>
          <div className={`cc-mod-stat-v ${personas > 0 ? 'pu' : ''}`}>{personas}</div>
          <div className="cc-mod-stat-sub">
            {personas > 0
              ? engines
                  .filter((e) => e.persona)
                  .map((e) => e.name)
                  .join(' · ')
              : 'aún no se entrena ninguna'}
          </div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Top engines · salud y estado</div>
        {topByHealth.length === 0 ? (
          <EmptyEngines />
        ) : (
          <div className="cc-mod-list">
            {topByHealth.map((e) => {
              const isComing = e.status === 'coming_soon';
              return (
                <div key={e.id} className="cc-mod-row">
                  <div className="cc-mod-ic">{e.icon}</div>
                  <div className="cc-mod-body">
                    <div className="cc-mod-name">
                      {e.name}{' '}
                      {isComing && (
                        <span
                          className="cc-mod-badge"
                          style={{
                            color: 'var(--cc-amber)',
                            borderColor: 'rgba(245,177,61,.3)',
                            background: 'var(--cc-amber-g)',
                          }}
                        >
                          Próximamente
                        </span>
                      )}
                    </div>
                    <div className="cc-mod-sub">
                      {e.type} · {e.region}
                      {e.node !== '—' && ` · ${e.node}`}
                    </div>
                  </div>
                  <div className="cc-mod-right">
                    <b className={e.revenueCents > 0 ? 'gr' : undefined}>
                      {e.revenueCents > 0
                        ? `$${Math.round(e.revenueCents / 100).toLocaleString()}`
                        : isComing
                          ? '—'
                          : '$0'}
                    </b>
                    <span>
                      {e.state === 'OFFLINE' ? 'offline' : `salud ${e.health}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Engines con atención requerida</div>
        {needAttention.length === 0 ? (
          <div
            style={{
              padding: '32px 22px',
              border: '1px dashed var(--cc-line-2)',
              borderRadius: 'var(--cc-r-l)',
              textAlign: 'center',
              color: 'var(--cc-txt-3)',
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            ● <b style={{ color: 'var(--cc-green)' }}>Todo en verde</b> — ningún engine
            requiere intervención.
            <br />
            <span
              style={{
                color: 'var(--cc-txt-4)',
                fontSize: 11.5,
                fontFamily: 'var(--cc-mono), monospace',
                marginTop: 6,
                display: 'inline-block',
              }}
            >
              Aquí aparecen errores y degradaciones cuando ocurran.
            </span>
          </div>
        ) : (
          <div className="cc-mod-list">
            {needAttention.map((e) => (
              <div key={e.id} className="cc-mod-row">
                <div className="cc-mod-ic">{e.icon}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">
                    {e.name}{' '}
                    <span className={`cc-mod-badge ${e.stateCode === 'r' ? 'r' : 'am'}`}>
                      {e.stateCode === 'r' ? 'Error' : 'Degradado'}
                    </span>
                  </div>
                  <div className="cc-mod-sub">{e.description}</div>
                </div>
                <div className="cc-mod-right">
                  <b>{e.health}%</b>
                  <span>{e.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyEngines() {
  return (
    <div
      style={{
        padding: '40px 22px',
        border: '1px dashed var(--cc-line-2)',
        borderRadius: 'var(--cc-r-l)',
        textAlign: 'center',
        color: 'var(--cc-txt-3)',
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      Sin engines en el catálogo.
      <br />
      <span
        style={{
          color: 'var(--cc-txt-4)',
          fontSize: 11.5,
          fontFamily: 'var(--cc-mono), monospace',
          marginTop: 6,
          display: 'inline-block',
        }}
      >
        Si recién corriste las migraciones, hay 2 activos (NexoClip, NexoStreamManager) y 4
        coming-soon — visibles en{' '}
        <Link
          href={'/dashboard/engines' as Route}
          style={{ color: 'var(--cc-green)', textDecoration: 'underline' }}
        >
          /dashboard/engines
        </Link>
        .
      </span>
    </div>
  );
}
