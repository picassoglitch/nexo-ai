import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { SubscriptionActions } from '@/components/workspace/subscription-actions';
import { TIER_CAPS, buildQuotaRows } from '@/lib/billing/tiers';

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
  const caps = TIER_CAPS[tier];
  const quotaRows = buildQuotaRows(tier);

  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-statgrid">
          <div className="cc-mod-stat">
            <div className="cc-mod-stat-l">Plan actual</div>
            <div className="cc-mod-stat-v gr">{caps.label}</div>
            <div className="cc-mod-stat-sub">
              {tier === 'FREE' ? 'Sin cargo · sin tarjeta' : `${caps.price} / ${caps.per}`}
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
            <div className="cc-mod-stat-l">Sistemas en vivo</div>
            <div className="cc-mod-stat-v gr">
              {caps.liveBotsCount === Infinity ? '∞' : caps.liveBotsCount}
            </div>
            <div className="cc-mod-stat-sub">
              {tier === 'FREE'
                ? 'solo simulación'
                : tier === 'PRO'
                  ? 'tú eliges cuál'
                  : 'todos los sistemas'}
            </div>
          </div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Cambia tu plan</div>
        <SubscriptionActions initialTier={tier} userId={session.user.id} isAdmin={isAdmin} />
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Uso este período · {caps.label}</div>
        <div className="cc-mod-list">
          {quotaRows.map((row) => {
            const pct = row.cap > 0 ? Math.min(100, (row.used / row.cap) * 100) : 0;
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
