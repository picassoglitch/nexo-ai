import { setRequestLocale } from 'next-intl/server';

const CLIPS = Array.from({ length: 18 }, (_, i) => ({
  id: `clip-${4187 - i}`,
  title: ['Trade ejecutado', 'Stream highlight', 'Reaction moment', 'AVA explaining', 'Code walkthrough', 'Hype moment'][i % 6]!,
  bot: ['NexoClip', 'NexoClip', 'AVA Streamer', 'NexoClip', 'ThumbSmith', 'NexoClip'][i % 6]!,
  platform: ['TikTok', 'Reels', 'Shorts'][i % 3]!,
  views: Math.floor(Math.random() * 12000) + 200,
  time: `${Math.floor(Math.random() * 23)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}`,
}));

export default async function ClipsPage({
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
          <div className="cc-mod-stat-l">Clips totales</div>
          <div className="cc-mod-stat-v">418</div>
          <div className="cc-mod-stat-sub">+53 hoy</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Views agregados</div>
          <div className="cc-mod-stat-v gr">241k</div>
          <div className="cc-mod-stat-sub">vs 89k mes anterior</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">CTR promedio</div>
          <div className="cc-mod-stat-v cy">4.8<small>%</small></div>
          <div className="cc-mod-stat-sub">P50 por clip</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">En renderizado</div>
          <div className="cc-mod-stat-v pu">12</div>
          <div className="cc-mod-stat-sub">NexoClip · batch 12/40</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Recientes</div>
        <div className="cc-mod-clipgrid">
          {CLIPS.map((c) => (
            <div key={c.id} className="cc-mod-cliptile">
              <div className="thumb" />
              <div className="cap">
                <div className="t">{c.title}</div>
                <div className="m">
                  {c.platform} · {c.views.toLocaleString()} views · {c.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
