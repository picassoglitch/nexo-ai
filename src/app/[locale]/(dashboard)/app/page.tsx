import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { getSessionUser } from '@/lib/auth/session';
import { listEngines } from '@/lib/data/engines';
import { TIER_CAPS, effectiveTier, isAdminRole } from '@/lib/billing/tiers';

export const metadata = { title: 'Tu espacio' };

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  const meta = session?.user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    session?.user.email?.split('@')[0] ||
    'Operator';
  const role = session?.role ?? 'VIEWER';
  const storedTier = session?.tier ?? 'FREE';
  const tier = effectiveTier(role, storedTier);
  const isAdmin = isAdminRole(role);
  const caps = TIER_CAPS[tier];

  // Find their live engine (for PRO) so the landing can spotlight it.
  let selectedEngineName: string | null = null;
  if (tier === 'PRO' && session?.selectedEngineId) {
    const engines = await listEngines();
    selectedEngineName =
      engines.find((e) => e.id === session.selectedEngineId)?.name ?? null;
  }

  const heroSub = isAdmin
    ? `Tu rol <b style="color:var(--cc-purple)">${role.replace('_', ' ')}</b> te da acceso completo a todos los engines, sin importar tu plan (almacenado: <b>${storedTier.replace('_', '-')}</b>).`
    : tier === 'FREE'
      ? `Estás en el plan <b style="color:var(--cc-green)">Free</b>. Explora los engines en modo simulación y desbloquea ejecución en vivo cuando estés listo.`
      : tier === 'PRO'
        ? `Estás en <b style="color:var(--cc-green)">Pro</b>${
            selectedEngineName
              ? ` — tu slot en vivo lo tiene <b>${selectedEngineName}</b>.`
              : ' — todavía no elegiste tu engine en vivo. Pasa a Mis engines para activar uno.'
          }`
        : `Estás en <b style="color:var(--cc-green)">All-Access</b>. Todos los engines disponibles corren en vivo con los límites más altos.`;

  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <h2
          style={{
            fontFamily: 'var(--cc-disp), sans-serif',
            fontSize: 'clamp(22px, 3vw, 32px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 6,
          }}
        >
          Hola, {name.split(' ')[0]} 👋
        </h2>
        <p
          style={{ color: 'var(--cc-txt-3)', fontSize: 14, maxWidth: '64ch' }}
          dangerouslySetInnerHTML={{ __html: heroSub }}
        />
      </div>

      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Engines en vivo</div>
          <div className="cc-mod-stat-v gr">
            {caps.liveEnginesCount === Infinity ? '∞' : caps.liveEnginesCount}
          </div>
          <div className="cc-mod-stat-sub">
            {tier === 'FREE'
              ? 'solo simulación'
              : tier === 'PRO'
                ? selectedEngineName
                  ? `activo: ${selectedEngineName}`
                  : 'todavía no elegido'
                : 'todos disponibles'}
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Trabajos este mes</div>
          <div className="cc-mod-stat-v">0</div>
          <div className="cc-mod-stat-sub">de {caps.jobsPerMonth.toLocaleString()} permitidos</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Tokens IA</div>
          <div className="cc-mod-stat-v cy">0</div>
          <div className="cc-mod-stat-sub">
            de {caps.tokensPerMonth.toLocaleString()} este mes
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costo IA</div>
          <div className="cc-mod-stat-v gr">$0.00</div>
          <div className="cc-mod-stat-sub">incluido en tu plan</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">
          {tier === 'FREE' ? 'Próximos pasos' : 'Tu espacio'}
        </div>
        <div className="cc-mod-grid cc-mod-grid-2">
          <Link
            href={'/app/engines' as Route}
            className="cc-mod-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cc-mod-card-head">
              <span className="cc-mod-tag">01</span>
              <span className="cc-mod-badge gr">
                {tier === 'FREE'
                  ? 'Empezar aquí'
                  : tier === 'PRO'
                    ? 'Tu engine en vivo'
                    : 'Todo en vivo'}
              </span>
            </div>
            <h4>
              {tier === 'FREE'
                ? 'Explora los engines disponibles'
                : 'Administra tus engines'}
            </h4>
            <p>
              {tier === 'FREE'
                ? 'NexoClip y NexoStreamManager están en simulación. Pruébalos antes de subir a Pro.'
                : tier === 'PRO'
                  ? 'Elige tu engine en vivo, o cambia tu selección cuando quieras.'
                  : 'Los engines activos corren en vivo. Monitorea desde aquí.'}
            </p>
            <div className="cc-mod-meta">
              <span>→ Ir a mis engines</span>
            </div>
          </Link>

          <Link
            href={'/app/subscription' as Route}
            className="cc-mod-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cc-mod-card-head">
              <span className="cc-mod-tag">02</span>
              <span className={`cc-mod-badge ${tier === 'ALL_ACCESS' ? 'gr' : 'cy'}`}>
                {tier === 'FREE'
                  ? 'Cuando estés listo'
                  : tier === 'PRO'
                    ? 'Tu plan'
                    : 'Top tier'}
              </span>
            </div>
            <h4>
              {tier === 'FREE'
                ? 'Activa ejecución en vivo'
                : tier === 'PRO'
                  ? 'Sube a All-Access'
                  : 'Gestiona tu suscripción'}
            </h4>
            <p>
              {tier === 'FREE'
                ? `Pro (${TIER_CAPS.PRO.price}/${TIER_CAPS.PRO.per}) para un engine en vivo, o All-Access (${TIER_CAPS.ALL_ACCESS.price}/${TIER_CAPS.ALL_ACCESS.per}) para todos.`
                : tier === 'PRO'
                  ? `${TIER_CAPS.ALL_ACCESS.price}/${TIER_CAPS.ALL_ACCESS.per} para desbloquear todos los engines en vivo y los límites más altos.`
                  : 'Cambia tu método de pago, descarga facturas, o cancela en cualquier momento.'}
            </p>
            <div className="cc-mod-meta">
              <span>→ {tier === 'ALL_ACCESS' ? 'Ver suscripción' : 'Ver planes'}</span>
            </div>
          </Link>

          <Link
            href={'/app/usage' as Route}
            className="cc-mod-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cc-mod-card-head">
              <span className="cc-mod-tag">03</span>
              <span className="cc-mod-tag">Monitoreo</span>
            </div>
            <h4>Mide tu uso en vivo</h4>
            <p>
              Cuotas, ejecuciones y costo IA — actualizados en tiempo real conforme tus engines
              trabajan.
            </p>
            <div className="cc-mod-meta">
              <span>→ Ver mi uso</span>
            </div>
          </Link>

          <Link
            href={'/app/settings' as Route}
            className="cc-mod-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cc-mod-card-head">
              <span className="cc-mod-tag">04</span>
              <span className="cc-mod-tag">Cuenta</span>
            </div>
            <h4>Asegura tu cuenta</h4>
            <p>Activa 2FA, revisa tus sesiones, y configura notificaciones del sistema.</p>
            <div className="cc-mod-meta">
              <span>→ Abrir ajustes</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
