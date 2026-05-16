import { setRequestLocale } from 'next-intl/server';

const QUEUES = [
  { id: 'q1', name: 'clip-render', depth: 12, capacity: 50, latency: '210ms', state: 'pu' as const, owner: 'NexoClip · GPU-04' },
  { id: 'q2', name: 'caption-gen', depth: 38, capacity: 100, latency: '155ms', state: 'am' as const, owner: 'SubtitleForge · w-07' },
  { id: 'q3', name: 'publish-out', depth: 4, capacity: 30, latency: '98ms', state: 'gr' as const, owner: 'Publishing · w-03' },
  { id: 'q4', name: 'thumb-gen', depth: 1, capacity: 20, latency: '88ms', state: 'gr' as const, owner: 'ThumbSmith · w-07' },
  { id: 'q5', name: 'vod-compress', depth: 6, capacity: 8, latency: '280ms', state: 'am' as const, owner: 'VOD Compressor · GPU-01' },
  { id: 'q6', name: 'lead-enrich', depth: 0, capacity: 40, latency: '130ms', state: 'gr' as const, owner: 'Realestate Scraper · w-09' },
  { id: 'q7', name: 'backup-snap', depth: 22, capacity: 1, latency: '—', state: 'r' as const, owner: 'BackupRunner · w-01' },
];

export default async function QueuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Colas activas</div>
        <div className="cc-mod-list">
          {QUEUES.map((q) => {
            const pct = Math.min(100, (q.depth / q.capacity) * 100);
            const fill = pct > 80 ? 'r' : pct > 50 ? 'am' : 'gr';
            return (
              <div key={q.id} className="cc-mod-row">
                <div className="cc-mod-ic">≡</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">
                    {q.name}{' '}
                    <span className={`cc-mod-badge ${q.state}`}>
                      {q.state === 'gr' ? 'OK' : q.state === 'am' ? 'Backpressure' : q.state === 'pu' ? 'Procesando' : 'Bloqueada'}
                    </span>
                  </div>
                  <div className="cc-mod-sub" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
                    <span>
                      {q.depth}/{q.capacity}
                    </span>
                    <span className="cc-bar-track">
                      <span className={`cc-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
                    </span>
                  </div>
                </div>
                <div className="cc-mod-right">
                  <b>{q.latency}</b>
                  <span>{q.owner}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
