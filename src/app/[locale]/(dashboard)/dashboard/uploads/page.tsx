import { setRequestLocale } from 'next-intl/server';

const UPLOADS = [
  { id: 'u1', name: 'stream-2026-05-16-ava.mp4', size: '3.2 GB', kind: 'VOD source', state: 'pu' as const, label: 'Procesando · 64%', when: 'hace 8 min' },
  { id: 'u2', name: 'pharma-platform-mock-v2.fig', size: '142 MB', kind: 'Design asset', state: 'gr' as const, label: 'Listo', when: 'hace 1 h' },
  { id: 'u3', name: 'aws-architecture-rev3.pdf', size: '8.4 MB', kind: 'Document', state: 'gr' as const, label: 'Listo', when: 'hace 2 h' },
  { id: 'u4', name: 'leads-cdmx-may.csv', size: '612 KB', kind: 'Dataset', state: 'gr' as const, label: 'Importado · 1840 filas', when: 'hace 3 h' },
  { id: 'u5', name: 'gpu-bench-q2.zip', size: '481 MB', kind: 'Archive', state: 'am' as const, label: 'Quota 92%', when: 'hace 6 h' },
];

export default async function UploadsPage({
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
          <div className="cc-mod-stat-l">Almacenamiento usado</div>
          <div className="cc-mod-stat-v am">42.8<small>GB / 50</small></div>
          <div className="cc-mod-stat-sub">S3 · us-east-1</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Subidas hoy</div>
          <div className="cc-mod-stat-v">14</div>
          <div className="cc-mod-stat-sub">5.8 GB transferidos</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">En procesamiento</div>
          <div className="cc-mod-stat-v pu">1</div>
          <div className="cc-mod-stat-sub">VOD ingest pipeline</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Recientes</div>
        <div className="cc-mod-list">
          {UPLOADS.map((u) => (
            <div key={u.id} className="cc-mod-row">
              <div className="cc-mod-ic">⬆</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {u.name} <span className={`cc-mod-badge ${u.state}`}>{u.label}</span>
                </div>
                <div className="cc-mod-sub">
                  {u.kind} · {u.size}
                </div>
              </div>
              <div className="cc-mod-right">
                <b>{u.when}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
