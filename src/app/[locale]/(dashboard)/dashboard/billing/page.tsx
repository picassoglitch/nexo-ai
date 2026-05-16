import { setRequestLocale } from 'next-intl/server';

const INVOICES = [
  { id: 'INV-2026-04', date: '01 abr 2026', period: 'Mar 2026', amount: '$129.00', state: 'gr' as const, label: 'Pagado', method: 'MP · ••2840' },
  { id: 'INV-2026-03', date: '01 mar 2026', period: 'Feb 2026', amount: '$129.00', state: 'gr' as const, label: 'Pagado', method: 'MP · ••2840' },
  { id: 'INV-2026-02', date: '01 feb 2026', period: 'Ene 2026', amount: '$39.00', state: 'gr' as const, label: 'Pagado', method: 'MP · ••2840' },
  { id: 'INV-2026-01', date: '01 ene 2026', period: 'Dic 2025', amount: '$39.00', state: 'gr' as const, label: 'Pagado', method: 'MP · ••2840' },
];

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Plan actual</div>
        <div className="cc-mod-grid cc-mod-grid-2">
          <div className="cc-mod-card">
            <div className="cc-mod-card-head">
              <span className="cc-mod-badge gr">Activo</span>
              <span className="cc-mod-tag">renueva 01 may 2026</span>
            </div>
            <h4 style={{ fontSize: 24 }}>All-Access</h4>
            <p>Todos los sistemas desbloqueados · ejecución en vivo · soporte prioritario.</p>
            <div className="cc-mod-meta">
              <span>
                <b className="gr">USD $129</b> / mes
              </span>
              <span>
                Próximo cargo: <b>01 may 2026</b>
              </span>
            </div>
          </div>
          <div className="cc-mod-card">
            <div className="cc-mod-card-head">
              <span className="cc-mod-badge">Método</span>
            </div>
            <h4>Mercado Pago</h4>
            <p>Tarjeta terminada en ••2840 · vence 04/28</p>
            <div className="cc-mod-meta">
              <span>
                Estado: <b className="gr">OK</b>
              </span>
              <span>Último cobro: 01 abr 2026</span>
            </div>
          </div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Historial de facturas</div>
        <div className="cc-mod-list">
          {INVOICES.map((i) => (
            <div key={i.id} className="cc-mod-row">
              <div className="cc-mod-ic">▦</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {i.id} <span className={`cc-mod-badge ${i.state}`}>{i.label}</span>
                </div>
                <div className="cc-mod-sub">
                  {i.period} · {i.method}
                </div>
              </div>
              <div className="cc-mod-right">
                <b className="gr">{i.amount}</b>
                <span>{i.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
