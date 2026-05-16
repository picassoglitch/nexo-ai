import { setRequestLocale } from 'next-intl/server';

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="cc-scroll">
      <div
        style={{
          padding: '60px 24px',
          border: '1px dashed var(--cc-line-2)',
          borderRadius: 'var(--cc-r-l)',
          textAlign: 'center',
          color: 'var(--cc-txt-3)',
          fontSize: 14,
          lineHeight: 1.65,
        }}
      >
        Sin ejecuciones en tu historial todavía.
        <br />
        <span
          style={{
            color: 'var(--cc-txt-4)',
            fontSize: 12,
            fontFamily: 'var(--cc-mono), monospace',
          }}
        >
          Cuando lances tu primer sistema en simulación o en vivo, verás aquí cada trabajo, sus
          logs y el resultado.
        </span>
      </div>
    </div>
  );
}
