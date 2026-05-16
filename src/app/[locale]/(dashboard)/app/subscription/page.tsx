import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser, type SubscriptionTier } from '@/lib/auth/session';
import { SubscriptionActions } from '@/components/workspace/subscription-actions';

const TIER_DISPLAY: Record<SubscriptionTier, { label: string; price: string; per: string }> = {
  FREE: { label: 'Free', price: '$0', per: 'siempre' },
  PRO: { label: 'Pro', price: 'USD $39', per: 'mes' },
  ALL_ACCESS: { label: 'All-Access', price: 'USD $129', per: 'mes' },
};

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect('/sign-in?next=/app/subscription');
  const tier = session.tier;
  const isAdmin = session.role === 'SUPER_ADMIN' || session.role === 'ADMIN';
  const display = TIER_DISPLAY[tier];

  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-statgrid">
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Plan actual</div>
            <div className="cc-mod-stat-v gr">{display.label}</div>
            <div className="cc-mod-stat-sub">
              {tier === 'FREE' ? 'Sin cargo · sin tarjeta' : `${display.price} / ${display.per}`}
            </div>
          </div>
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Renovación</div>
            <div className="cc-mod-stat-v">{tier === 'FREE' ? '—' : '01 jun'}</div>
            <div className="cc-mod-stat-sub">
              {tier === 'FREE' ? 'Free no caduca' : 'cargo automático'}
            </div>
          </div>
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Método de pago</div>
            <div className="cc-mod-stat-v">{tier === 'FREE' ? '—' : 'Mercado Pago'}</div>
            <div className="cc-mod-stat-sub">
              {tier === 'FREE' ? 'No requerido en Free' : 'wires en step 05'}
            </div>
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
        <SubscriptionActions
          initialTier={tier}
          userId={session.user.id}
          isAdmin={isAdmin}
        />
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Uso este período</div>
        <div className="cc-mod-list">
          {[
            { label: 'Trabajos IA', used: 0, cap: tier === 'FREE' ? 100 : tier === 'PRO' ? 2000 : 20000, unit: 'trabajos' },
            { label: 'Tokens IA', used: 0, cap: tier === 'FREE' ? 50_000 : tier === 'PRO' ? 2_000_000 : 20_000_000, unit: 'tokens' },
            { label: 'Almacenamiento', used: 0, cap: tier === 'FREE' ? 500 : tier === 'PRO' ? 5000 : 50000, unit: 'MB' },
            { label: 'Sistemas activos', used: 0, cap: tier === 'FREE' ? 1 : tier === 'PRO' ? 1 : 16, unit: tier === 'FREE' ? 'sistema (sim)' : 'sistemas en vivo' },
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
