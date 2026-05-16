import { setRequestLocale } from 'next-intl/server';
import { listBots } from '@/lib/data/bots';
import { ENV_LABEL } from '@/lib/data/types';

export default async function MyBotsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // For v1 every Free subscriber sees the full system library in simulation mode.
  // Per-tier filtering (Pro → 1 system live, All-Access → all live) gates in step 05.
  const bots = await listBots();

  return (
    <div className="cc-scroll">
      <p
        style={{
          color: 'var(--cc-txt-3)',
          fontSize: 13,
          marginBottom: 18,
          maxWidth: '60ch',
        }}
      >
        Todos los sistemas están disponibles en modo simulación con tu plan Free. Pasa a Pro para
        ejecutar uno en vivo, o All-Access para todos.
      </p>

      <div className="cc-mod-grid">
        {bots.map((b) => (
          <div key={b.id} className="cc-mod-card">
            <div className="cc-mod-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{b.icon}</span>
                <div>
                  <h4 style={{ fontSize: 14 }}>{b.name}</h4>
                  <div
                    style={{
                      fontFamily: 'var(--cc-mono), monospace',
                      fontSize: 10.5,
                      color: 'var(--cc-txt-4)',
                      marginTop: 2,
                    }}
                  >
                    {b.type}
                  </div>
                </div>
              </div>
              <span className="cc-mod-badge cy">Simulación</span>
            </div>
            <p>{b.description}</p>
            <div className="cc-mod-meta">
              <span>{ENV_LABEL[b.env]}</span>
              <span>{b.region}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
