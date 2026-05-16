import { setRequestLocale } from 'next-intl/server';
import { listBots } from '@/lib/data/bots';

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const bots = await listBots();
  const total = bots.reduce((a, b) => a + b.revenueCents, 0);
  const revenueBots = bots.filter((b) => b.revenueCents > 0).sort((a, b) => b.revenueCents - a.revenueCents);

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
          <div className="cc-mod-stat-v cy">{revenueBots.length}</div>
          <div className="cc-mod-stat-sub">de {bots.length} totales</div>
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
          {revenueBots.map((b) => {
            const pct = total > 0 ? (b.revenueCents / total) * 100 : 0;
            return (
              <div key={b.id} className="cc-mod-row">
                <div className="cc-mod-ic">{b.icon}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">{b.name}</div>
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
                  <b className="gr">${Math.round(b.revenueCents / 100).toLocaleString()}</b>
                  <span>{b.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
