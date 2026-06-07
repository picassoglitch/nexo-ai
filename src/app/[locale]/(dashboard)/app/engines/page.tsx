import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { listEngines } from '@/lib/data/engines';
import { ENV_LABEL } from '@/lib/data/types';
import { getSessionUser } from '@/lib/auth/session';
import {
  engineCanRunLive,
  TIER_CAPS,
  effectiveTier,
  isAdminRole,
} from '@/lib/billing/tiers';
import { LiveEngineSelectButton } from '@/components/workspace/live-engine-selector';

// Browser tab → "Mis engines · Nexo AI" (template in [locale]/layout.tsx).
export const metadata = { title: 'Mis engines' };

// PARTNER ranks alongside PRO for tier-required gates (same level of access).
// The owned-engine override is handled separately via engineCanRunLive.
const TIER_LABEL_SHORT = {
  FREE: 'Free',
  PRO: 'Pro',
  PARTNER: 'Partner',
  ALL_ACCESS: 'All-Access',
} as const;

export default async function MyEnginesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [engines, session] = await Promise.all([listEngines(), getSessionUser()]);
  const role = session?.role ?? 'VIEWER';
  const storedTier = session?.tier ?? 'FREE';
  const tier = effectiveTier(role, storedTier);
  const isAdmin = isAdminRole(role);
  const selectedEngineId = session?.selectedEngineId ?? null;
  const caps = TIER_CAPS[tier];

  // Tier-specific page intro copy. Admin gets its own copy noting role-overrides-tier.
  const intro = isAdmin
    ? `Como ${role.replace('_', ' ')}, tienes acceso completo a todos los engines — tu rol pasa por encima del tier almacenado (${storedTier.replace('_', '-')}).`
    : tier === 'FREE'
      ? 'Estás en el plan Free — todos los engines están disponibles en modo simulación. Pasa a Pro para ejecutar uno en vivo, o All-Access para todos.'
      : tier === 'PRO'
        ? 'Estás en Pro — elige UN engine para correr en vivo. El resto sigue disponible en simulación. Cambia tu selección cuando quieras.'
        : 'Estás en All-Access — todos los engines disponibles corren en vivo, con los límites más altos de uso.';

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
              Pro: 1 engine en vivo · {TIER_CAPS.PRO.jobsPerMonth.toLocaleString()} trabajos/mes ·{' '}
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

      {tier === 'PRO' && selectedEngineId && (
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
            {engines.find((e) => e.id === selectedEngineId)?.name ?? 'un engine'}
          </b>
          . Haz clic en &laquo;Activar en vivo&raquo; en otro engine para cambiar la selección.
        </div>
      )}

      {/* Empty state for when the migration hasn't run yet */}
      {engines.length === 0 && (
        <div
          style={{
            padding: '40px 24px',
            border: '1px dashed var(--cc-line-2)',
            borderRadius: 'var(--cc-r-l)',
            textAlign: 'center',
            color: 'var(--cc-txt-3)',
            fontSize: 13,
            lineHeight: 1.55,
            marginBottom: 24,
          }}
        >
          Sin engines disponibles.
          <br />
          <span
            style={{
              color: 'var(--cc-txt-4)',
              fontSize: 12,
              fontFamily: 'var(--cc-mono), monospace',
              marginTop: 6,
              display: 'inline-block',
            }}
          >
            Si eres admin: corre <b>supabase/migrations/0010_rename_bots_to_engines.sql</b>{' '}
            en Supabase y refresca.
          </span>
        </div>
      )}

      <div className="cc-mod-grid">
        {engines.map((engine) => {
          const isComingSoon = engine.status === 'coming_soon';
          const isDeprecated = engine.status === 'deprecated';
          // Available = engine is active AND user's tier qualifies for its tier_required.
          const tierOrder = { FREE: 0, PRO: 1, PARTNER: 1, ALL_ACCESS: 2 } as const;
          const meetsTier = tierOrder[tier] >= tierOrder[engine.tierRequired];
          // Partner-owned override: the engine's owner sees it as always-live,
          // regardless of selected_engine_id. Marketplace viewers (other users)
          // see the same badge metadata but the live flag uses the standard rule.
          const isOwnedByMe =
            engine.ownerUserId !== null && engine.ownerUserId === session?.user.id;
          const isLive =
            engine.status === 'active' &&
            meetsTier &&
            engineCanRunLive(tier, engine.id, selectedEngineId, isOwnedByMe);
          const isSelected = engine.id === selectedEngineId;
          // Owner attribution: every engine gets a chip. Platform-owned
          // (no partner_id) → "by Nexo AI" in a muted style. Partner-owned
          // → "by [name]" in the partner-purple style.
          const isPlatformOwned = engine.ownerUserId === null;
          const ownerLabel = isPlatformOwned
            ? 'Nexo AI'
            : engine.ownerDisplayName ||
              engine.ownerEmail?.split('@')[0] ||
              'Partner';

          return (
            <div
              key={engine.id}
              className="cc-mod-card"
              style={{
                borderColor: isLive
                  ? 'var(--cc-green)'
                  : isComingSoon
                    ? 'var(--cc-line-2)'
                    : undefined,
                background: isLive
                  ? 'rgba(158,234,58,.04)'
                  : isComingSoon
                    ? 'rgba(255,255,255,.015)'
                    : undefined,
                opacity: isComingSoon || isDeprecated ? 0.75 : 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div className="cc-mod-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{engine.icon}</span>
                  <div>
                    <h4 style={{ fontSize: 14 }}>
                      {engine.name}
                      {/* Attribution chip — purple for partner engines,
                          muted gray for platform-owned (Nexo AI). */}
                      <span
                        style={{
                          marginLeft: 8,
                          fontFamily: 'var(--cc-mono), monospace',
                          fontSize: 9.5,
                          letterSpacing: '0.1em',
                          color: isPlatformOwned ? 'var(--cc-txt-4)' : 'var(--cc-purple)',
                          background: isPlatformOwned
                            ? 'rgba(255,255,255,.03)'
                            : 'var(--cc-purple-g)',
                          border: isPlatformOwned
                            ? '1px solid var(--cc-line-2)'
                            : '1px solid rgba(157,123,255,.3)',
                          padding: '2px 7px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          verticalAlign: 'middle',
                        }}
                        title={`Engine creado por ${ownerLabel}${isOwnedByMe ? ' (tú)' : ''}`}
                      >
                        {isOwnedByMe ? 'Tu engine' : `by ${ownerLabel}`}
                      </span>
                    </h4>
                    <div
                      style={{
                        fontFamily: 'var(--cc-mono), monospace',
                        fontSize: 10.5,
                        color: 'var(--cc-txt-4)',
                        marginTop: 2,
                      }}
                    >
                      {engine.type}
                    </div>
                  </div>
                </div>

                {/* Status badge: coming-soon trumps live/simulation labels */}
                {isComingSoon ? (
                  <span
                    className="cc-mod-badge"
                    style={{
                      color: 'var(--cc-amber)',
                      borderColor: 'rgba(245,177,61,.3)',
                      background: 'var(--cc-amber-g)',
                    }}
                  >
                    Próximamente
                  </span>
                ) : isDeprecated ? (
                  <span className="cc-mod-badge r">Deprecado</span>
                ) : isLive ? (
                  <span className="cc-mod-badge gr">● EN VIVO</span>
                ) : tier === 'FREE' ? (
                  <span className="cc-mod-badge cy">Simulación</span>
                ) : (
                  <span className="cc-mod-badge">Simulación</span>
                )}
              </div>
              <p>{engine.description}</p>

              <div className="cc-mod-meta">
                <span>{ENV_LABEL[engine.env]}</span>
                <span>{engine.region}</span>
                {/* Tier-required hint, only when relevant */}
                {engine.tierRequired !== 'FREE' && (
                  <span
                    style={{
                      color: meetsTier ? 'var(--cc-txt-4)' : 'var(--cc-amber)',
                      fontFamily: 'var(--cc-mono), monospace',
                      fontSize: 10.5,
                    }}
                  >
                    Requiere {TIER_LABEL_SHORT[engine.tierRequired]}
                  </span>
                )}
              </div>

              {/* ── Action area ──────────────────────────────────────────
                  Active engines get an "Abrir →" CTA going to /app/engines/[slug]
                  + (for PRO users) the "Activar en vivo" toggle. Coming-soon
                  engines show a disabled teaser. */}
              <div
                style={{
                  marginTop: 'auto',
                  paddingTop: 12,
                  borderTop: '1px solid var(--cc-line-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                {/* Primary CTA: Open / Coming soon teaser */}
                {engine.status === 'active' ? (
                  <Link
                    href={`/app/engines/${engine.slug}` as Route}
                    style={{
                      color: meetsTier ? 'var(--cc-green)' : 'var(--cc-txt-2)',
                      fontSize: 12.5,
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      textDecoration: 'none',
                      padding: '6px 10px 6px 0',
                    }}
                  >
                    Abrir engine →
                  </Link>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--cc-txt-4)',
                      fontFamily: 'var(--cc-mono), monospace',
                    }}
                  >
                    📅 te avisamos al lanzar
                  </span>
                )}

                {/* Secondary: PRO live-bot toggle (when applicable) */}
                {tier === 'PRO' && engine.status === 'active' && meetsTier && (
                  <LiveEngineSelectButton
                    engineId={engine.id}
                    engineName={engine.name}
                    isCurrentlySelected={isSelected}
                  />
                )}
                {tier === 'FREE' && engine.status === 'active' && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--cc-txt-4)',
                      fontFamily: 'var(--cc-mono), monospace',
                    }}
                  >
                    🔒 Live → Pro
                  </span>
                )}
                {tier === 'PRO' && engine.status === 'active' && !meetsTier && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--cc-amber)',
                      fontFamily: 'var(--cc-mono), monospace',
                    }}
                  >
                    🔒 All-Access
                  </span>
                )}
              </div>
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
              <b>{caps.liveEnginesCount === Infinity ? '∞' : caps.liveEnginesCount}</b>
              <span>engines en vivo</span>
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
              <div className="cc-mod-sub">across all engines</div>
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
