import { setRequestLocale } from 'next-intl/server';
import { SubscriptionActions } from '@/components/workspace/subscription-actions';

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Current tier source (v1): hard-coded 'free' until step 05 wires Mercado Pago.
  // The SubscriptionActions component owns the change flow client-side and will
  // call the real /api/billing/portal once the integration lands.
  const tier = 'free' as const;

  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-statgrid">
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Plan actual</div>
            <div className="cc-mod-stat-v gr">Free</div>
            <div className="cc-mod-stat-sub">Sin cargo · sin tarjeta</div>
          </div>
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Renovación</div>
            <div className="cc-mod-stat-v">—</div>
            <div className="cc-mod-stat-sub">Free no caduca</div>
          </div>
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Método de pago</div>
            <div className="cc-mod-stat-v">—</div>
            <div className="cc-mod-stat-sub">No requerido en Free</div>
          </div>
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Activo desde</div>
            <div className="cc-mod-stat-v">Hoy</div>
            <div className="cc-mod-stat-sub">primera sesión</div>
          </div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Cambia tu plan</div>
        <SubscriptionActions initialTier={tier} />
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Uso este período</div>
        <div className="cc-mod-list">
          {[
            { label: 'Trabajos IA', used: 0, cap: 100, unit: 'trabajos' },
            { label: 'Tokens IA', used: 0, cap: 50_000, unit: 'tokens' },
            { label: 'Almacenamiento', used: 0, cap: 500, unit: 'MB' },
            { label: 'Sistemas activos', used: 0, cap: 1, unit: 'sistema (sim)' },
          ].map((row) => {
            const pct = Math.min(100, (row.used / row.cap) * 100);
            const fill = pct > 85 ? 'r' : pct > 60 ? 'am' : 'gr';
            return (
              <div key={row.label} className="cc-mod-row">
                <div className="cc-mod-body">
                  <div className="cc-mod-name">{row.label}</div>
                  <div
                    className="cc-mod-sub"
                    style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}
                  >
                    <span>
                      {row.used.toLocaleString()} / {row.cap.toLocaleString()} {row.unit}
                    </span>
                    <span className="cc-bar-track" style={{ maxWidth: 220 }}>
                      <span className={`cc-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontSize: 11.5,
            color: 'var(--cc-txt-4)',
            fontFamily: 'var(--cc-mono), monospace',
            marginTop: 10,
            paddingLeft: 4,
          }}
        >
          ▸ Los contadores reales se conectan al motor de telemetry en step 05.
        </p>
      </div>
    </div>
  );
}
