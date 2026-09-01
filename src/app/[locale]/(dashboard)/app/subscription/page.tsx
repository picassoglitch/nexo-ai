import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { getSessionUser } from '@/lib/auth/session';
import { SubscriptionActions } from '@/components/workspace/subscription-actions';
import { TIER_CAPS, buildQuotaRows, effectiveTier, isAdminRole } from '@/lib/billing/tiers';

export const metadata = { title: 'Tu plan' };

export default async function SubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect('/sign-in?next=/app/subscription');
  // For admins, quotas + capabilities follow the EFFECTIVE tier (VIP).
  // The stored tier is still shown in the plan card so the billing row is
  // honest — admins are simply not gated by it.
  const storedTier = session.tier;
  const role = session.role;
  const isAdmin = isAdminRole(role);
  const tier = effectiveTier(role, storedTier);
  const caps = TIER_CAPS[tier];
  const storedCaps = TIER_CAPS[storedTier];
  const quotaRows = buildQuotaRows(tier);

  return (
    <>
      {isAdmin && (
        <div className="ws-notice info ws-enter">
          <div className="ws-notice-body">
            <h3>Modo {role.replace('_', ' ')}</h3>
            <p>
              Tu rol manda sobre el plan guardado: tienes acceso completo a todos los engines sin
              importar lo que diga la tarjeta de abajo. El plan almacenado sigue ahí para que
              pruebes lo que ven los suscriptores — cambiarlo no te quita acceso.
            </p>
          </div>
        </div>
      )}

      <section className="ws-section">
        <div className="ws-grid ws-grid-3">
          <div className="ws-stat ws-enter" style={{ '--i': 1 } as React.CSSProperties}>
            <div className="ws-stat-l">{isAdmin ? 'Plan almacenado' : 'Tu plan'}</div>
            <div className="ws-stat-v acid">{storedCaps.label}</div>
            <div className="ws-stat-sub">
              {storedTier === 'FREE'
                ? 'sin cargo · sin tarjeta'
                : `${storedCaps.price} / ${storedCaps.per}`}
            </div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 2 } as React.CSSProperties}>
            <div className="ws-stat-l">{isAdmin ? 'Acceso efectivo' : 'Se renueva'}</div>
            <div className="ws-stat-v">
              {isAdmin ? 'VIP' : storedTier === 'FREE' ? '—' : '01 oct'}
            </div>
            <div className="ws-stat-sub">
              {isAdmin
                ? `por tu rol ${role.replace('_', ' ')}`
                : storedTier === 'FREE'
                  ? 'Free nunca vence'
                  : 'se cobra solo'}
            </div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="ws-stat-l">Engines que puedes encender</div>
            <div className="ws-stat-v">
              {caps.liveEnginesCount === Infinity ? '∞' : caps.liveEnginesCount}
            </div>
            <div className="ws-stat-sub">
              {tier === 'FREE'
                ? 'solo en modo prueba'
                : tier === 'PRO'
                  ? 'tú eliges cuál'
                  : 'todos a la vez'}
            </div>
          </div>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-sl">Cambia tu plan</div>
        <SubscriptionActions initialTier={tier} userId={session.user.id} isAdmin={isAdmin} />
      </section>

      <section className="ws-section">
        <div className="ws-sl">Tus límites este mes · {caps.label}</div>
        <div className="ws-list">
          {quotaRows.map((row) => {
            const pct = row.cap > 0 ? Math.min(100, (row.used / row.cap) * 100) : 0;
            const fill = pct > 85 ? 'danger' : pct > 60 ? 'warn' : '';
            return (
              <div key={row.label} className="ws-row">
                <div className="ws-row-body">
                  <div className="ws-row-name">{row.label}</div>
                  <div className="ws-meter">
                    <span>
                      {row.used.toLocaleString('es-MX')} / {row.cap.toLocaleString('es-MX')}{' '}
                      {row.unit}
                    </span>
                    <span className="ws-bar">
                      <span className={`ws-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
                    </span>
                    <span>{Math.round(pct)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="ws-sub" style={{ marginTop: 12 }}>
          ¿Quieres el detalle de tokens día por día?{' '}
          <Link href={'/app/usage' as Route} className="ws-go">
            Ver uso y tokens
          </Link>
        </p>
      </section>
    </>
  );
}
