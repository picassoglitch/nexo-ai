import { setRequestLocale } from 'next-intl/server';

const NOTIFS = [
  { id: 'n1', state: 'r' as const, label: 'CRÍTICO', title: 'BackupRunner — quota S3 excedida', body: 'El worker w-01 no puede escribir respaldos. Liberar 8 GB o ampliar bucket.', when: 'hace 12 min', unread: true },
  { id: 'n2', state: 'am' as const, label: 'AVISO', title: 'AssemblyAI — 72% de la cuota mensual', body: 'A este ritmo se agota en 9 días. Considerar aumentar plan o reducir uso.', when: 'hace 1 h', unread: true },
  { id: 'n3', state: 'am' as const, label: 'AVISO', title: 'ArbiX Spread — latencia elevada', body: 'Latencia promedio subió a 340ms (umbral 250ms). Posible problema de red en w-11.', when: 'hace 2 h', unread: true },
  { id: 'n4', state: 'gr' as const, label: 'INFO', title: 'NexoClip publicó 12 clips a TikTok', body: '8 sobre umbral viral. Ver detalles en /publishing.', when: 'hace 3 h', unread: false },
  { id: 'n5', state: 'gr' as const, label: 'INFO', title: 'Quantorpolybot — milestone $1,840 P&L sombra', body: '+15% por encima del objetivo trimestral.', when: 'hace 6 h', unread: false },
];

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Sin leer (3)</div>
        <div className="cc-mod-list">
          {NOTIFS.filter((n) => n.unread).map((n) => (
            <div key={n.id} className="cc-mod-row">
              <div className="cc-mod-ic">🔔</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  <span className={`cc-mod-badge ${n.state}`}>{n.label}</span> {n.title}
                </div>
                <div className="cc-mod-sub">{n.body}</div>
              </div>
              <div className="cc-mod-right">
                <b>{n.when}</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Anteriores</div>
        <div className="cc-mod-list">
          {NOTIFS.filter((n) => !n.unread).map((n) => (
            <div key={n.id} className="cc-mod-row">
              <div className="cc-mod-ic">🔔</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  <span className={`cc-mod-badge ${n.state}`}>{n.label}</span> {n.title}
                </div>
                <div className="cc-mod-sub">{n.body}</div>
              </div>
              <div className="cc-mod-right">
                <b>{n.when}</b>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
