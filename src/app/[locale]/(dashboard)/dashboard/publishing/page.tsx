import { setRequestLocale } from 'next-intl/server';

const PUBS = [
  { id: 'p1', clip: 'Trade ejecutado #4187', platform: 'TikTok', state: 'gr' as const, label: 'Publicado', when: '10:42', engage: '1.2k views · 84 likes' },
  { id: 'p2', clip: 'AVA explaining #4186', platform: 'Reels', state: 'gr' as const, label: 'Publicado', when: '10:38', engage: '482 views · 22 likes' },
  { id: 'p3', clip: 'Code walkthrough #4185', platform: 'Shorts', state: 'gr' as const, label: 'Publicado', when: '10:35', engage: '318 views · 14 likes' },
  { id: 'p4', clip: 'Reaction moment #4184', platform: 'TikTok', state: 'pu' as const, label: 'Programado · 11:30', when: 'queued', engage: '—' },
  { id: 'p5', clip: 'Hype moment #4183', platform: 'Reels', state: 'pu' as const, label: 'Programado · 11:32', when: 'queued', engage: '—' },
  { id: 'p6', clip: 'Stream highlight #4182', platform: 'YouTube', state: 'am' as const, label: 'En cola', when: 'queued', engage: '—' },
  { id: 'p7', clip: 'AVA explaining #4181', platform: 'TikTok', state: 'r' as const, label: 'Rechazado · derechos', when: '09:18', engage: 'pendiente revisión' },
];

export default async function PublishingPage({
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
          <div className="cc-mod-stat-l">Publicaciones hoy</div>
          <div className="cc-mod-stat-v gr">42</div>
          <div className="cc-mod-stat-sub">TikTok 18 · Reels 14 · Shorts 10</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Programadas</div>
          <div className="cc-mod-stat-v pu">7</div>
          <div className="cc-mod-stat-sub">Próximas 24h</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Rechazadas 7d</div>
          <div className="cc-mod-stat-v am">3</div>
          <div className="cc-mod-stat-sub">Revisar derechos · auto-rechazo</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Recientes</div>
        <div className="cc-mod-list">
          {PUBS.map((p) => (
            <div key={p.id} className="cc-mod-row">
              <div className="cc-mod-ic">↗</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {p.clip} <span className={`cc-mod-badge ${p.state}`}>{p.label}</span>
                </div>
                <div className="cc-mod-sub">
                  → {p.platform} · {p.engage}
                </div>
              </div>
              <div className="cc-mod-right">
                <b>{p.when}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
