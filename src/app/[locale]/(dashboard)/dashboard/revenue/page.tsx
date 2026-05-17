import { setRequestLocale } from 'next-intl/server';
import { listEngines } from '@/lib/data/engines';

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const engines = await listEngines();
  const total = engines.reduce((a, e) => a + e.revenueCents, 0);
  const revenueEngines = engines
    .filter((e) => e.revenueCents > 0)
    .sort((a, b) => b.revenueCents - a.revenueCents);

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">MRR estimado</div>
          <div className="cc-mod-stat-v gr">${Math.round((total / 100) * 30).toLocaleString()}</div>
          <div className="cc-mod-stat-sub">basado en 30d shadow</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Ingresos hoy</div>
          <div className="cc-mod-stat-v gr">${Math.round(total / 100).toLocaleString()}</div>
          <div className="cc-mod-stat-sub">+12% vs ayer</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Sistemas con ingreso</div>
          <div className="cc-mod-stat-v cy">{revenueEngines.length}</div>
          <div className="cc-mod-stat-sub">de {engines.length} totales</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costo IA hoy</div>
          <div className="cc-mod-stat-v am">$84.20</div>
          <div className="cc-mod-stat-sub">margen 99.2%</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Ingresos por sistema</div>
        <div className="cc-mod-list">
          {revenueEngines.map((e) => {
            const pct = total > 0 ? (e.revenueCents / total) * 100 : 0;
            return (
              <div key={e.id} className="cc-mod-row">
                <div className="cc-mod-ic">{e.icon}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">{e.name}</div>
                  <div
                    className="cc-mod-sub"
                    style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}
                  >
                    <span>{pct.toFixed(1)}%</span>
                    <span className="cc-bar-track">
                      <span className="cc-bar-fill gr" style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                </div>
                <div className="cc-mod-right">
                  <b className="gr">${Math.round(e.revenueCents / 100).toLocaleString()}</b>
                  <span>{e.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
