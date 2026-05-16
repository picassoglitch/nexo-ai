import { setRequestLocale } from 'next-intl/server';

const RESOURCES = [
  {
    ic: '📖',
    title: 'Guía de inicio rápido',
    body: 'Conecta tu primer sistema en menos de 3 minutos. Setup paso a paso.',
    href: '#',
  },
  {
    ic: '🤖',
    title: 'Catálogo de bots',
    body: 'Qué hace cada sistema, en qué tier está disponible, y casos de uso.',
    href: '#',
  },
  {
    ic: '💳',
    title: 'Cambiar de plan',
    body: 'Cómo subir o bajar de tier, cancelar, y cobros prorrateados.',
    href: '#',
  },
  {
    ic: '🛟',
    title: 'Soporte directo',
    body: 'Escríbenos en cualquier momento — respondemos en un día hábil.',
    href: 'mailto:support@nexo-ai.world',
  },
];

export default async function HelpPage({
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
          <div className="cc-mod-stat-l">Estado de la plataforma</div>
          <div className="cc-mod-stat-v gr">Operativo</div>
          <div className="cc-mod-stat-sub">Todos los sistemas en línea</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Tiempo de respuesta</div>
          <div className="cc-mod-stat-v">&lt; 1<small>día hábil</small></div>
          <div className="cc-mod-stat-sub">support@nexo-ai.world</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Recursos</div>
        <div className="cc-mod-grid cc-mod-grid-2">
          {RESOURCES.map((r) => (
            <a
              key={r.title}
              href={r.href}
              className="cc-mod-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="cc-mod-card-head">
                <span style={{ fontSize: 22 }}>{r.ic}</span>
              </div>
              <h4>{r.title}</h4>
              <p>{r.body}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
