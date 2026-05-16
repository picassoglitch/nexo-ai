import { setRequestLocale } from 'next-intl/server';

const STREAMS = [
  { id: 'ava-kick', host: 'AVA Streamer', platform: 'Kick', title: 'AI co-host · IRL + coding', viewers: 312, since: '02:14', state: 'live', clips: 18 },
  { id: 'qpoly-live', host: 'Quantorpolybot', platform: 'Twitch', title: 'Shadow trading · Polymarket', viewers: 64, since: '04:42', state: 'live', clips: 4 },
  { id: 'nclip-replay', host: 'NexoClip', platform: 'TikTok', title: 'Auto-publishing últimas 24h', viewers: 0, since: 'scheduled', state: 'scheduled', clips: 31 },
];

export default async function StreamsPage({
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
          <div className="cc-mod-stat-l">Streams en vivo</div>
          <div className="cc-mod-stat-v gr">2</div>
          <div className="cc-mod-stat-sub">+1 programado</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Viewers ahora</div>
          <div className="cc-mod-stat-v gr">376</div>
          <div className="cc-mod-stat-sub">Peak 24h: 612</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Clips generados hoy</div>
          <div className="cc-mod-stat-v cy">53</div>
          <div className="cc-mod-stat-sub">→ TikTok · Reels · Shorts</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Uptime ingest</div>
          <div className="cc-mod-stat-v gr">99.94<small>%</small></div>
          <div className="cc-mod-stat-sub">rtmp-1 · us-east-1</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Streams</div>
        <div className="cc-mod-grid cc-mod-grid-2">
          {STREAMS.map((s) => (
            <div key={s.id} className="cc-mod-card">
              <div className="cc-mod-card-head">
                <span className={`cc-mod-badge ${s.state === 'live' ? 'gr' : 'am'}`}>
                  {s.state === 'live' ? '● LIVE' : '○ SCHEDULED'}
                </span>
                <span className="cc-mod-tag">{s.platform}</span>
              </div>
              <h4>{s.title}</h4>
              <p>
                Host: <b style={{ color: 'var(--cc-txt-2)' }}>{s.host}</b>
              </p>
              <div className="cc-mod-meta">
                <span>
                  <b className="gr">{s.viewers}</b> viewers
                </span>
                <span>
                  <b>{s.since}</b> {s.state === 'live' ? 'en vivo' : ''}
                </span>
                <span>
                  <b className="cy">{s.clips}</b> clips
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
