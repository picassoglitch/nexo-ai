import { setRequestLocale } from 'next-intl/server';

export default async function WorkspaceBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Método de pago</div>
        <div
          style={{
            padding: '32px 24px',
            border: '1px dashed var(--cc-line-2)',
            borderRadius: 'var(--cc-r-l)',
            textAlign: 'center',
            color: 'var(--cc-txt-3)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Aún no tienes método de pago.
          <br />
          <span
            style={{
              color: 'var(--cc-txt-4)',
              fontSize: 12,
              fontFamily: 'var(--cc-mono), monospace',
            }}
          >
            Lo agregamos automáticamente al pasar a Pro o All-Access.
          </span>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Historial de facturas</div>
        <div
          style={{
            padding: '32px 24px',
            border: '1px dashed var(--cc-line-2)',
            borderRadius: 'var(--cc-r-l)',
            textAlign: 'center',
            color: 'var(--cc-txt-4)',
            fontSize: 13,
            fontFamily: 'var(--cc-mono), monospace',
          }}
        >
          Sin facturas — Free no genera cargos.
        </div>
      </div>
    </div>
  );
}
