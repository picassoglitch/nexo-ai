import { setRequestLocale } from 'next-intl/server';

const KEYS = [
  { provider: 'Anthropic', mask: 'sk-ant-•••••••••mxQ4', state: 'gr' as const, label: 'OK', usage: '12% usado', cost30d: '$214.80', primary: true },
  { provider: 'OpenAI', mask: 'sk-•••••••••8a2J', state: 'gr' as const, label: 'OK', usage: '8% usado', cost30d: '$118.40', primary: false },
  { provider: 'Replicate', mask: 'r8_•••••••••wK3p', state: 'gr' as const, label: 'OK', usage: '34% usado', cost30d: '$48.12', primary: false },
  { provider: 'AssemblyAI', mask: '•••••••••2nT', state: 'am' as const, label: '72% usado', usage: 'cerca de límite', cost30d: '$72.60', primary: false },
  { provider: 'Stripe', mask: 'sk_live_•••••••••K9wQ', state: 'gr' as const, label: 'OK', usage: '—', cost30d: '—', primary: false },
  { provider: 'Resend', mask: 're_•••••••••mP4', state: 'gr' as const, label: 'OK', usage: '14% usado', cost30d: '$12.00', primary: false },
];

export default async function ApiPage({
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
          <div className="cc-mod-stat-l">Llaves activas</div>
          <div className="cc-mod-stat-v">{KEYS.length}</div>
          <div className="cc-mod-stat-sub">2 con rotación pendiente</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costo IA 30d</div>
          <div className="cc-mod-stat-v am">$466.00</div>
          <div className="cc-mod-stat-sub">$15.50 / día promedio</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Requests 24h</div>
          <div className="cc-mod-stat-v cy">142k</div>
          <div className="cc-mod-stat-sub">0.3% error rate</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Llaves por proveedor</div>
        <div className="cc-mod-list">
          {KEYS.map((k) => (
            <div key={k.provider} className="cc-mod-row">
              <div className="cc-mod-ic">⌘</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {k.provider}{' '}
                  {k.primary && <span className="cc-mod-badge gr">Primary</span>}{' '}
                  <span className={`cc-mod-badge ${k.state}`}>{k.label}</span>
                </div>
                <div className="cc-mod-sub">
                  {k.mask} · {k.usage}
                </div>
              </div>
              <div className="cc-mod-right">
                <b>{k.cost30d}</b>
                <span>30d</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
