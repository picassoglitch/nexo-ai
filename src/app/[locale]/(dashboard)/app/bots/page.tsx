import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { listBots } from '@/lib/data/bots';
import { ENV_LABEL } from '@/lib/data/types';
import { getSessionUser } from '@/lib/auth/session';
import { botCanRunLive, TIER_CAPS } from '@/lib/billing/tiers';
import { LiveBotSelectButton } from '@/components/workspace/live-bot-selector';

export default async function MyBotsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [bots, session] = await Promise.all([listBots(), getSessionUser()]);
  const tier = session?.tier ?? 'FREE';
  const selectedBotId = session?.selectedBotId ?? null;
  const caps = TIER_CAPS[tier];

  // Tier-specific page intro copy.
  const intro =
    tier === 'FREE'
      ? 'Estás en el plan Free — todos los sistemas están disponibles en modo simulación. Pasa a Pro para ejecutar uno en vivo, o All-Access para todos.'
      : tier === 'PRO'
        ? 'Estás en Pro — elige UN sistema para correr en vivo. El resto sigue disponible en simulación. Cambia tu selección cuando quieras.'
        : 'Estás en All-Access — todos los sistemas corren en vivo, con los límites más altos de uso.';

  return (
    <div className="cc-scroll">
      <p
        style={{
          color: 'var(--cc-txt-3)',
          fontSize: 13,
          marginBottom: 18,
          maxWidth: '64ch',
        }}
      >
        {intro}
      </p>

      {tier === 'FREE' && (
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid var(--cc-line-2)',
            background: 'var(--cc-panel)',
            borderRadius: 'var(--cc-r-l)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              Desbloquea ejecución en vivo
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--cc-txt-3)' }}>
              Pro: 1 sistema en vivo · {TIER_CAPS.PRO.jobsPerMonth.toLocaleString()} trabajos/mes ·{' '}
              {TIER_CAPS.PRO.historyDays} días de historial.
            </div>
          </div>
          <Link
            href={'/app/subscription' as Route}
            style={{
              background: 'var(--cc-green)',
              color: '#070809',
              padding: '10px 16px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Ver planes →
          </Link>
        </div>
      )}

      {tier === 'PRO' && selectedBotId && (
        <div
          style={{
            padding: '12px 16px',
            border: '1px solid var(--cc-green)',
            background: 'var(--cc-green-g)',
            borderRadius: 'var(--cc-r-l)',
            marginBottom: 20,
            fontSize: 12.5,
            color: 'var(--cc-txt-2)',
          }}
        >
          ● Tu slot Pro está ocupado por{' '}
          <b style={{ color: 'var(--cc-green)' }}>
            {bots.find((b) => b.id === selectedBotId)?.name ?? 'un sistema'}
          </b>
          . Haz clic en &laquo;Activar en vivo&raquo; en otro sistema para cambiar la selección.
        </div>
      )}

      <div className="cc-mod-grid">
        {bots.map((b) => {
          const isLive = botCanRunLive(tier, b.id, selectedBotId);
          const isSelected = b.id === selectedBotId;
          return (
            <div
              key={b.id}
              className="cc-mod-card"
              style={{
                borderColor: isLive ? 'var(--cc-green)' : undefined,
                background: isLive ? 'rgba(158,234,58,.04)' : undefined,
              }}
            >
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
                {isLive ? (
                  <span className="cc-mod-badge gr">● EN VIVO</span>
                ) : tier === 'FREE' ? (
                  <span className="cc-mod-badge cy">Simulación</span>
                ) : tier === 'PRO' ? (
                  <span className="cc-mod-badge">Simulación</span>
                ) : null}
              </div>
              <p>{b.description}</p>

              <div className="cc-mod-meta">
                <span>{ENV_LABEL[b.env]}</span>
                <span>{b.region}</span>
              </div>

              {tier === 'PRO' && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 12,
                    borderTop: '1px solid var(--cc-line-soft)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <LiveBotSelectButton
                    botId={b.id}
                    botName={b.name}
                    isCurrentlySelected={isSelected}
                  />
                </div>
              )}

              {tier === 'FREE' && (
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 12,
                    borderTop: '1px solid var(--cc-line-soft)',
                    fontSize: 11,
                    color: 'var(--cc-txt-4)',
                    fontFamily: 'var(--cc-mono), monospace',
                    textAlign: 'right',
                  }}
                >
                  🔒 Live execution — upgrade a Pro
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tier capability footer reference */}
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Capacidades de tu plan</div>
        <div className="cc-mod-list">
          <div className="cc-mod-row">
            <div className="cc-mod-body">
              <div className="cc-mod-name">Plan</div>
              <div className="cc-mod-sub">{caps.label} · {caps.price} / {caps.per}</div>
            </div>
            <div className="cc-mod-right">
              <b>{caps.liveBotsCount === Infinity ? '∞' : caps.liveBotsCount}</b>
              <span>sistemas en vivo</span>
            </div>
          </div>
          <div className="cc-mod-row">
            <div className="cc-mod-body">
              <div className="cc-mod-name">Trabajos / mes</div>
              <div className="cc-mod-sub">incluidos en el plan</div>
            </div>
            <div className="cc-mod-right">
              <b>{caps.jobsPerMonth.toLocaleString()}</b>
            </div>
          </div>
          <div className="cc-mod-row">
            <div className="cc-mod-body">
              <div className="cc-mod-name">Tokens IA / mes</div>
              <div className="cc-mod-sub">across all sistemas</div>
            </div>
            <div className="cc-mod-right">
              <b>{caps.tokensPerMonth.toLocaleString()}</b>
            </div>
          </div>
          <div className="cc-mod-row">
            <div className="cc-mod-body">
              <div className="cc-mod-name">Almacenamiento</div>
              <div className="cc-mod-sub">clips · VODs · uploads</div>
            </div>
            <div className="cc-mod-right">
              <b>{caps.storageMB >= 1000 ? `${caps.storageMB / 1000} GB` : `${caps.storageMB} MB`}</b>
            </div>
          </div>
          <div className="cc-mod-row">
            <div className="cc-mod-body">
              <div className="cc-mod-name">Historial</div>
              <div className="cc-mod-sub">retención de logs y ejecuciones</div>
            </div>
            <div className="cc-mod-right">
              <b>{caps.historyDays >= 365 ? '1 año+' : `${caps.historyDays} días`}</b>
            </div>
          </div>
          <div className="cc-mod-row">
            <div className="cc-mod-body">
              <div className="cc-mod-name">Soporte</div>
              <div className="cc-mod-sub">canal de contacto</div>
            </div>
            <div className="cc-mod-right">
              <b>
                {caps.hasPrioritySupport
                  ? 'Prioritario'
                  : tier === 'PRO'
                    ? 'Email'
                    : 'Comunidad'}
              </b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
