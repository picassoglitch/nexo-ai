import { setRequestLocale } from 'next-intl/server';

export default async function UsagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // v1 stub usage — wires to real counters from the bot_health table per-user
  // in step 04-DATABASE (once user-scoped runs are tracked).
  const meters = [
    { label: 'Trabajos IA · este mes', used: 0, cap: 100, unit: 'trabajos', sub: 'Reinicia el día 1' },
    { label: 'Tokens IA · este mes', used: 0, cap: 50_000, unit: 'tokens', sub: 'Across all sistemas' },
    { label: 'Almacenamiento', used: 0, cap: 500, unit: 'MB', sub: 'Clips · VODs · uploads' },
    { label: 'Ejecuciones en vivo', used: 0, cap: 0, unit: 'horas', sub: 'Solo en planes pagos' },
  ];

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Período</div>
          <div className="cc-mod-stat-v">May 2026</div>
          <div className="cc-mod-stat-sub">renueva 01 jun</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Trabajos hoy</div>
          <div className="cc-mod-stat-v cy">0</div>
          <div className="cc-mod-stat-sub">0 ayer</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costo IA estimado</div>
          <div className="cc-mod-stat-v gr">$0.00</div>
          <div className="cc-mod-stat-sub">incluido en Free</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Cuotas del período</div>
        <div className="cc-mod-list">
          {meters.map((m) => {
            const pct = m.cap > 0 ? Math.min(100, (m.used / m.cap) * 100) : 0;
            const fill = pct > 85 ? 'r' : pct > 60 ? 'am' : 'gr';
            return (
              <div key={m.label} className="cc-mod-row">
                <div className="cc-mod-body">
                  <div className="cc-mod-name">{m.label}</div>
                  <div
                    className="cc-mod-sub"
                    style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}
                  >
                    <span>
                      {m.used.toLocaleString()} / {m.cap.toLocaleString() || '—'} {m.unit}
                    </span>
                    <span className="cc-bar-track" style={{ maxWidth: 240 }}>
                      <span className={`cc-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                </div>
                <div className="cc-mod-right">
                  <b>{m.sub}</b>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Actividad reciente</div>
        <div
          style={{
            padding: '40px 24px',
            border: '1px dashed var(--cc-line-2)',
            borderRadius: 'var(--cc-r-l)',
            textAlign: 'center',
            color: 'var(--cc-txt-3)',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          Aún no has ejecutado ningún sistema.
          <br />
          <span style={{ color: 'var(--cc-txt-4)', fontSize: 12, fontFamily: 'var(--cc-mono), monospace' }}>
            Tu actividad aparecerá aquí cuando lances tu primer trabajo.
          </span>
        </div>
      </div>
    </div>
  );
}
