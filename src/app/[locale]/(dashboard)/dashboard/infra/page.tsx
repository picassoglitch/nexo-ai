import { setRequestLocale } from 'next-intl/server';

const WORKERS = [
  { id: 'gpu-01', name: 'GPU-01', region: 'us-west-2', kind: 'RTX 4090', util: 82, ram: '38 / 64 GB', state: 'pu' as const, label: 'Rendering', cost: '$3.40/h' },
  { id: 'gpu-02', name: 'GPU-02', region: 'us-west-2', kind: 'RTX 4090', util: 91, ram: '54 / 64 GB', state: 'pu' as const, label: 'Rendering', cost: '$3.40/h' },
  { id: 'gpu-03', name: 'GPU-03', region: 'us-west-2', kind: 'A100 40GB', util: 68, ram: '21 / 40 GB', state: 'cy' as const, label: 'Training', cost: '$4.10/h' },
  { id: 'gpu-04', name: 'GPU-04', region: 'us-west-2', kind: 'RTX 4090', util: 74, ram: '42 / 64 GB', state: 'pu' as const, label: 'Rendering', cost: '$3.40/h' },
  { id: 'w-01', name: 'w-01', region: 'us-east-1', kind: 't3.large', util: 12, ram: '2.8 / 8 GB', state: 'r' as const, label: 'Error storage', cost: '$0.084/h' },
  { id: 'w-02', name: 'w-02', region: 'us-east-1', kind: 't3.large', util: 38, ram: '4.1 / 8 GB', state: 'gr' as const, label: 'Active', cost: '$0.084/h' },
  { id: 'w-03', name: 'w-03', region: 'us-east-1', kind: 't3.large', util: 22, ram: '3.1 / 8 GB', state: 'gr' as const, label: 'Active', cost: '$0.084/h' },
  { id: 'w-07', name: 'w-07', region: 'us-east-1', kind: 'c6i.xlarge', util: 64, ram: '5.8 / 8 GB', state: 'am' as const, label: 'Hot', cost: '$0.170/h' },
  { id: 'w-09', name: 'w-09', region: 'mx-central-1', kind: 't3.medium', util: 14, ram: '1.2 / 4 GB', state: 'gr' as const, label: 'Active', cost: '$0.042/h' },
  { id: 'w-11', name: 'w-11', region: 'us-east-1', kind: 't3.large', util: 88, ram: '6.4 / 8 GB', state: 'am' as const, label: 'Hot', cost: '$0.084/h' },
  { id: 'w-12', name: 'w-12', region: 'us-east-1', kind: 't3.large', util: 42, ram: '3.8 / 8 GB', state: 'gr' as const, label: 'Active', cost: '$0.084/h' },
  { id: 'rtmp-1', name: 'rtmp-1', region: 'us-east-1', kind: 'c6i.2xlarge', util: 38, ram: '12 / 16 GB', state: 'gr' as const, label: 'Ingest', cost: '$0.34/h' },
];

export default async function InfraPage({
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
          <div className="cc-mod-stat-l">Workers activos</div>
          <div className="cc-mod-stat-v gr">11<small>/ 12</small></div>
          <div className="cc-mod-stat-sub">1 en error · w-01</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">GPU util promedio</div>
          <div className="cc-mod-stat-v pu">79<small>%</small></div>
          <div className="cc-mod-stat-sub">4 nodos · us-west-2</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costo infra 24h</div>
          <div className="cc-mod-stat-v am">$148.40</div>
          <div className="cc-mod-stat-sub">$4,452 proyección mes</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Regiones</div>
          <div className="cc-mod-stat-v">3</div>
          <div className="cc-mod-stat-sub">us-east-1 · us-west-2 · mx-central-1</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Workers (12)</div>
        <div className="cc-mod-list">
          {WORKERS.map((w) => {
            const fill = w.util > 85 ? 'r' : w.util > 60 ? 'am' : 'gr';
            return (
              <div key={w.id} className="cc-mod-row">
                <div className="cc-mod-ic">▤</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">
                    {w.name} <span className={`cc-mod-badge ${w.state}`}>{w.label}</span>
                  </div>
                  <div
                    className="cc-mod-sub"
                    style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}
                  >
                    <span>
                      {w.kind} · {w.region}
                    </span>
                    <span className="cc-bar-track" style={{ maxWidth: 120 }}>
                      <span className={`cc-bar-fill ${fill}`} style={{ width: `${w.util}%` }} />
                    </span>
                    <span>{w.util}%</span>
                  </div>
                </div>
                <div className="cc-mod-right">
                  <b>{w.cost}</b>
                  <span>{w.ram}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
