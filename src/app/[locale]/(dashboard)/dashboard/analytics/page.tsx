import { setRequestLocale } from 'next-intl/server';

// Lightweight inline sparkline (no client JS — pure SVG).
function MiniLine({ data, color = 'var(--cc-green)' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${40 - ((v - min) / rng) * 36 - 2}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ width: '100%', height: 64 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

const SERIES = {
  jobs: Array.from({ length: 30 }, (_, i) => 80 + Math.sin(i / 3) * 24 + i * 1.4),
  revenue: Array.from({ length: 30 }, (_, i) => 120 + i * 8 + Math.random() * 30),
  errors: Array.from({ length: 30 }, (_, i) => 3 + Math.abs(Math.sin(i / 2)) * 4),
};

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Trabajos IA / 24h</div>
          <div className="cc-mod-stat-v cy">3,418</div>
          <div className="cc-mod-stat-sub">+12% vs 7d</div>
          <MiniLine data={SERIES.jobs} color="var(--cc-cyan)" />
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Ingresos 30d</div>
          <div className="cc-mod-stat-v gr">$10,116</div>
          <div className="cc-mod-stat-sub">+68% vs mes ant.</div>
          <MiniLine data={SERIES.revenue} color="var(--cc-green)" />
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Errores 30d</div>
          <div className="cc-mod-stat-v am">142</div>
          <div className="cc-mod-stat-sub">-22% vs mes ant.</div>
          <MiniLine data={SERIES.errors} color="var(--cc-amber)" />
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Distribución por categoría (30d)</div>
        <div className="cc-mod-list">
          {[
            { cat: 'Trading', pct: 38, value: '$4,210' },
            { cat: 'Content AI', pct: 28, value: '$2,860' },
            { cat: 'Streaming', pct: 18, value: '$1,840' },
            { cat: 'AI Agents', pct: 9, value: '$920' },
            { cat: 'Research', pct: 5, value: '$540' },
            { cat: 'Internal', pct: 2, value: '$0' },
          ].map((c) => (
            <div key={c.cat} className="cc-mod-row">
              <div className="cc-mod-body">
                <div className="cc-mod-name">{c.cat}</div>
                <div
                  className="cc-mod-sub"
                  style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}
                >
                  <span>{c.pct}%</span>
                  <span className="cc-bar-track">
                    <span className="cc-bar-fill gr" style={{ width: `${c.pct}%` }} />
                  </span>
                </div>
              </div>
              <div className="cc-mod-right">
                <b className="gr">{c.value}</b>
                <span>30d</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
