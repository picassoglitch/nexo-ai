import { setRequestLocale } from 'next-intl/server';
import { listBots } from '@/lib/data/bots';

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const bots = await listBots();
  const active = bots.filter((b) => b.stateCode !== 'o' && b.stateCode !== 'r').length;
  const totalRev = bots.reduce((a, b) => a + b.revenueCents, 0);
  const errored = bots.filter((b) => b.stateCode === 'r').length;
  const personas = bots.filter((b) => b.persona).length;

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Sistemas activos</div>
          <div className="cc-mod-stat-v gr">
            {active}
            <small>/ {bots.length}</small>
          </div>
          <div className="cc-mod-stat-sub">{errored} con error · {bots.length - active - errored} offline</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Ingresos mes</div>
          <div className="cc-mod-stat-v gr">${Math.round(totalRev / 100).toLocaleString()}</div>
          <div className="cc-mod-stat-sub">vs $3,820 mes anterior · +68%</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Trabajos IA / día</div>
          <div className="cc-mod-stat-v cy">3.4k</div>
          <div className="cc-mod-stat-sub">+12% vs 7d</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Personas IA entrenadas</div>
          <div className="cc-mod-stat-v pu">{personas}</div>
          <div className="cc-mod-stat-sub">Quantorpolybot · NexoClip · AVA Streamer · Nexo Persona</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Top sistemas por ingreso</div>
        <div className="cc-mod-list">
          {bots
            .filter((b) => b.revenueCents > 0)
            .sort((a, b) => b.revenueCents - a.revenueCents)
            .slice(0, 6)
            .map((b) => (
              <div key={b.id} className="cc-mod-row">
                <div className="cc-mod-ic">{b.icon}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">{b.name}</div>
                  <div className="cc-mod-sub">
                    {b.type} · {b.region} · {b.node}
                  </div>
                </div>
                <div className="cc-mod-right">
                  <b className="gr">${Math.round(b.revenueCents / 100).toLocaleString()}</b>
                  <span>Salud {b.health}%</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Sistemas con atención requerida</div>
        <div className="cc-mod-list">
          {bots
            .filter((b) => b.stateCode === 'r' || b.stateCode === 'a')
            .map((b) => (
              <div key={b.id} className="cc-mod-row">
                <div className="cc-mod-ic">{b.icon}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">
                    {b.name}{' '}
                    <span className={`cc-mod-badge ${b.stateCode === 'r' ? 'r' : 'am'}`}>
                      {b.stateCode === 'r' ? 'Error' : 'Degradado'}
                    </span>
                  </div>
                  <div className="cc-mod-sub">{b.description}</div>
                </div>
                <div className="cc-mod-right">
                  <b>{b.health}%</b>
                  <span>{b.latencyMs}ms</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
