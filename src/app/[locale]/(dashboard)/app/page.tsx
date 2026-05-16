import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { getSessionUser } from '@/lib/auth/session';

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
        <p style={{ color: 'var(--cc-txt-3)', fontSize: 14, maxWidth: 60 + 'ch' }}>
          Estás en el plan <b style={{ color: 'var(--cc-green)' }}>Free</b>. Ejecuta sistemas en
          modo simulación y desbloquea ejecución en vivo cuando estés listo.
        </p>
      </div>

      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Bots ejecutados</div>
          <div className="cc-mod-stat-v">0<small>/ 1 sim</small></div>
          <div className="cc-mod-stat-sub">Conecta tu primer sistema para empezar</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Trabajos este mes</div>
          <div className="cc-mod-stat-v">0</div>
          <div className="cc-mod-stat-sub">Plan Free: hasta 100/mes</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costo IA</div>
          <div className="cc-mod-stat-v gr">$0.00</div>
          <div className="cc-mod-stat-sub">incluido en tu plan</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Próximos pasos</div>
        <div className="cc-mod-grid cc-mod-grid-2">
          <Link
            href={'/app/bots' as Route}
            className="cc-mod-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cc-mod-card-head">
              <span className="cc-mod-tag">01</span>
              <span className="cc-mod-badge gr">Empezar aquí</span>
            </div>
            <h4>Explora tus bots disponibles</h4>
            <p>
              Plan Free desbloquea simulación en todos los sistemas. Prueba cualquiera antes de
              activarlo en vivo.
            </p>
            <div className="cc-mod-meta">
              <span>→ Ver mis bots</span>
            </div>
          </Link>
          <Link
            href={'/app/subscription' as Route}
            className="cc-mod-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div className="cc-mod-card-head">
              <span className="cc-mod-tag">02</span>
              <span className="cc-mod-badge cy">Cuando estés listo</span>
            </div>
            <h4>Activa ejecución en vivo</h4>
            <p>
              Pasa a Pro (USD $39/mes) para un sistema en vivo o All-Access (USD $129/mes) para
              todos.
            </p>
            <div className="cc-mod-meta">
              <span>→ Ver planes</span>
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
              Dashboards, métricas e historial de ejecución — las mismas herramientas que construimos
              para nosotros.
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
