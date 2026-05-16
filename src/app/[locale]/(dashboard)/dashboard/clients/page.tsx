import { setRequestLocale } from 'next-intl/server';

const CLIENTS = [
  { id: 'c1', name: 'Consumer Brand · Activation', sector: 'Marketing · Eventos', state: 'gr' as const, label: 'En operación', stack: 'Sensors · Vision · Kiosk', value: '$24,000 / contrato', since: 'feb 2026' },
  { id: 'c2', name: 'Pharma Healthcare Platform', sector: 'Salud · SaaS', state: 'gr' as const, label: 'En operación', stack: 'Laravel · Angular · MySQL · 2FA', value: '$48,000 / build + soporte', since: 'oct 2025' },
  { id: 'c3', name: 'Global Payments Processor', sector: 'Fintech · Infra cloud', state: 'gr' as const, label: 'Engagement multi-año', stack: 'AWS · Terraform · PCI DSS 4.0', value: 'Engagement multi-año', since: '2024' },
  { id: 'c4', name: 'LATAM Realestate Network', sector: 'Real estate · Leads', state: 'am' as const, label: 'Negociación', stack: 'Scraper · Discord · MX portales', value: 'Comisión intermediaria', since: 'preliminar' },
];

export default async function ClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Cuentas de cliente</div>
        <div className="cc-mod-grid cc-mod-grid-2">
          {CLIENTS.map((c) => (
            <div key={c.id} className="cc-mod-card">
              <div className="cc-mod-card-head">
                <span className={`cc-mod-badge ${c.state}`}>{c.label}</span>
                <span className="cc-mod-tag">desde {c.since}</span>
              </div>
              <h4>{c.name}</h4>
              <p>{c.sector}</p>
              <div className="cc-mod-meta">
                <span>{c.stack}</span>
              </div>
              <div className="cc-mod-meta" style={{ borderTop: 'none', paddingTop: 0 }}>
                <span>
                  Valor: <b className="gr">{c.value}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
