import { setRequestLocale } from 'next-intl/server';

const AUTOS = [
  { id: 'a1', trigger: 'On VOD upload', action: 'NexoClip → 12 clips · 3 variantes c/u', runs: 418, state: 'gr' as const },
  { id: 'a2', trigger: 'On clip render done', action: 'SubtitleForge → captions word-level', runs: 1248, state: 'gr' as const },
  { id: 'a3', trigger: 'On captions ready', action: 'Publishing → TikTok · Reels · Shorts', runs: 1186, state: 'gr' as const },
  { id: 'a4', trigger: 'On stream start (AVA)', action: 'ChatWarden moderation activate', runs: 142, state: 'gr' as const },
  { id: 'a5', trigger: 'Cron · 15min', action: 'Quantorpolybot scan signals', runs: 9120, state: 'gr' as const },
  { id: 'a6', trigger: 'On price spread > 0.4%', action: 'ArbiX Spread place limit order', runs: 38, state: 'am' as const },
  { id: 'a7', trigger: 'On lead capture', action: 'Realestate Scraper → Discord notify', runs: 612, state: 'gr' as const },
  { id: 'a8', trigger: 'On worker error', action: 'Notify + reintentar 3× exponencial', runs: 24, state: 'r' as const },
  { id: 'a9', trigger: 'Cron · daily 02:00', action: 'BackupRunner → S3 snapshot', runs: 90, state: 'r' as const },
  { id: 'a10', trigger: 'On revenue event', action: 'Webhook → /dashboard/revenue', runs: 481, state: 'gr' as const },
];

export default async function AutomationsPage({
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
          <div className="cc-mod-stat-l">Flujos activos</div>
          <div className="cc-mod-stat-v gr">31</div>
          <div className="cc-mod-stat-sub">29 healthy · 2 con error</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Ejecuciones 24h</div>
          <div className="cc-mod-stat-v cy">2,184</div>
          <div className="cc-mod-stat-sub">Latencia P50: 84ms</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Errores 24h</div>
          <div className="cc-mod-stat-v am">7</div>
          <div className="cc-mod-stat-sub">3 reintentadas con éxito</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Flujos (top por ejecuciones)</div>
        <div className="cc-mod-list">
          {AUTOS.sort((a, b) => b.runs - a.runs).map((a) => (
            <div key={a.id} className="cc-mod-row">
              <div className="cc-mod-ic">⟳</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {a.trigger}{' '}
                  <span className={`cc-mod-badge ${a.state}`}>
                    {a.state === 'gr' ? 'OK' : a.state === 'am' ? 'Degradado' : 'Error'}
                  </span>
                </div>
                <div className="cc-mod-sub">→ {a.action}</div>
              </div>
              <div className="cc-mod-right">
                <b>{a.runs.toLocaleString()}</b>
                <span>ejecuciones 30d</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
