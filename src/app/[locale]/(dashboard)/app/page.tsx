import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { getSessionUser } from '@/lib/auth/session';
import { listEngines } from '@/lib/data/engines';
import { getTokenBalance } from '@/lib/usage/tokens';
import {
  TIER_CAPS,
  effectiveTier,
  isAdminRole,
  engineIsLiveForUser,
  isNexoclipTrialActive,
  isNexoclipGraceActive,
  nexoclipTrialDaysLeft,
  NEXOCLIP_TRIAL_SLUG,
} from '@/lib/billing/tiers';
import { WelcomeGiftBanner } from '@/components/workspace/welcome-gift-banner';
import { NexoclipGraceBanner } from '@/components/workspace/nexoclip-grace-banner';
import { EngineGlyph } from '@/components/workspace/engines/engine-glyph';

export const metadata = { title: 'Inicio' };

const TIER_ORDER = { FREE: 0, PRO: 1, PARTNER: 1, VIP: 2 } as const;

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  const meta = session?.user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    session?.user.email?.split('@')[0] ||
    'Operator';
  const role = session?.role ?? 'VIEWER';
  const storedTier = session?.tier ?? 'FREE';
  const tier = effectiveTier(role, storedTier);
  const isAdmin = isAdminRole(role);
  const caps = TIER_CAPS[tier];

  // Real token balance + engine catalog. Both tolerate failure (balance falls
  // back to a zeroed shape; engines to an empty list) so the home never 500s.
  const [balance, engines] = await Promise.all([
    session ? getTokenBalance(session.user.id).catch(() => null) : Promise.resolve(null),
    listEngines().catch(() => []),
  ]);

  // NexoClip trial state (drives the live count + engine badges + spotlight).
  const nowMs = new Date().getTime();
  const trialActive = isNexoclipTrialActive(session?.nexoclipTrialStartedAt ?? null, nowMs);
  const trialDaysLeft = nexoclipTrialDaysLeft(session?.nexoclipTrialStartedAt ?? null, nowMs);
  // Post-trial grace: trial clock ran out but the FREE user still has PURCHASED
  // (bonus) tokens — NexoClip stays live until those are spent, then ends for
  // good (bonus doesn't regenerate monthly). Only meaningful for FREE.
  const clipBonusTokens = balance && !balance.unlimited ? balance.bonus : 0;
  const graceActive =
    tier === 'FREE' &&
    isNexoclipGraceActive(session?.nexoclipTrialStartedAt ?? null, nowMs, clipBonusTokens);

  // Per-engine view models — single source for live status across the cards
  // and the "Engines en vivo" count.
  const engineViews = engines
    .filter((e) => e.status !== 'deprecated')
    .map((engine) => {
      const meetsTier = TIER_ORDER[tier] >= TIER_ORDER[engine.tierRequired];
      const isOwnedByMe = engine.ownerUserId !== null && engine.ownerUserId === session?.user.id;
      const isTrial = trialActive && engine.slug === NEXOCLIP_TRIAL_SLUG;
      const isLive = engineIsLiveForUser({
        tier,
        engineId: engine.id,
        engineSlug: engine.slug,
        engineStatus: engine.status,
        meetsTier,
        selectedEngineId: session?.selectedEngineId ?? null,
        isOwnedByUser: isOwnedByMe,
        trialActive,
        graceActive,
      });
      const isSelected = engine.id === session?.selectedEngineId;
      return { engine, isLive, isTrial, isSelected };
    });

  const liveCount = engineViews.filter((v) => v.isLive).length;
  const unlimitedLive = caps.liveEnginesCount === Infinity;
  const liveEngineNames = engineViews.filter((v) => v.isLive).map((v) => v.engine.name);
  const liveSub = trialActive
    ? `NexoClip · prueba ${trialDaysLeft}d`
    : unlimitedLive
      ? 'todos disponibles'
      : liveEngineNames.length > 0
        ? liveEngineNames.join(', ')
        : tier === 'FREE'
          ? 'solo en modo prueba'
          : 'aún sin elegir';

  // Spotlight engine goes first: the live selection, else the active trial
  // engine, else the first active engine. Then live ones, then active, then
  // coming-soon — preserving the catalog's existing order within each bucket.
  const spotlightId =
    engineViews.find((v) => v.isSelected && v.isLive)?.engine.id ??
    engineViews.find((v) => v.isTrial)?.engine.id ??
    engineViews.find((v) => v.engine.status === 'active')?.engine.id ??
    null;
  const orderedViews = [...engineViews].sort((a, b) => {
    const rank = (v: (typeof engineViews)[number]) =>
      (v.engine.id === spotlightId ? 0 : 1) * 100 +
      (v.isLive ? 0 : 1) * 10 +
      (v.engine.status === 'active' ? 0 : 1);
    return rank(a) - rank(b);
  });

  const tokensBig = balance
    ? balance.unlimited
      ? '∞'
      : balance.remaining.toLocaleString('es-MX')
    : '0';
  const tokensSub = balance
    ? balance.unlimited
      ? 'admin · sin límite'
      : `de ${(balance.monthlyAllocation + balance.bonus).toLocaleString('es-MX')} este mes`
    : `de ${caps.tokensPerMonth.toLocaleString('es-MX')} este mes`;

  // One sentence that tells you where you stand. Plain text, no markup —
  // this used to be an HTML string piped through dangerouslySetInnerHTML
  // purely to colour a couple of words.
  const standing = isAdmin
    ? `Tu rol ${role.replace('_', ' ')} te da acceso a todos los engines, sin importar tu plan.`
    : trialActive
      ? `Tu prueba de NexoClip Pro está corriendo en vivo — te ${
          trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`
        }. Los demás engines los puedes probar en modo demo.`
      : tier === 'FREE'
        ? 'Estás en el plan Free. Prueba cualquier engine en modo demo y enciende el que quieras cuando estés listo.'
        : tier === 'PRO'
          ? liveEngineNames.length > 0
            ? `Estás en Pro y tu lugar en vivo lo tiene ${liveEngineNames[0]}. Puedes cambiarlo cuando quieras.`
            : 'Estás en Pro y todavía no eliges tu engine en vivo. Entra a Mis engines y enciende uno.'
          : 'Estás en VIP. Todos los engines disponibles corren en vivo, con los límites más altos.';

  return (
    <>
      {/* First-time welcome gift — banner + confetti on accept. Renders nothing
          once the user has claimed (server passes the claimed flag). */}
      <WelcomeGiftBanner claimed={session?.welcomeGiftClaimedAt != null} />

      {/* Post-trial grace: NexoClip trial expired but tokens remain — keep them
          going (and nudge toward Pro). Server-gated on graceActive. */}
      {graceActive && <NexoclipGraceBanner tokensRemaining={clipBonusTokens} />}

      <section className="ws-section ws-greet ws-enter">
        <h2>Hola, {name.split(' ')[0]}</h2>
        <p>{standing}</p>
      </section>

      <section className="ws-section">
        <div className="ws-grid ws-grid-3">
          <div className="ws-stat ws-enter" style={{ '--i': 1 } as React.CSSProperties}>
            <div className="ws-stat-l">Engines en vivo</div>
            <div className="ws-stat-v acid">{unlimitedLive ? '∞' : liveCount}</div>
            <div className="ws-stat-sub">{liveSub}</div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 2 } as React.CSSProperties}>
            <div className="ws-stat-l">Tokens de IA</div>
            <div className="ws-stat-v">{tokensBig}</div>
            <div className="ws-stat-sub">{tokensSub}</div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="ws-stat-l">Tu plan</div>
            <div className="ws-stat-v">{caps.label}</div>
            <div className="ws-stat-sub">
              {tier === 'FREE' ? 'sin cargo · sin tarjeta' : `${caps.price} / ${caps.per}`}
            </div>
          </div>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-sl">Tus engines</div>
        <div className="ws-grid ws-grid-3">
          {orderedViews.map(({ engine, isLive, isTrial }, i) => {
            const isComingSoon = engine.status === 'coming_soon';
            return (
              <Link
                key={engine.id}
                href={`/app/engines/${engine.slug}` as Route}
                className={`ws-card ws-enter${isLive ? ' is-live' : ''}${
                  isComingSoon ? ' is-soon' : ''
                }`}
                style={{ '--i': i + 1 } as React.CSSProperties}
              >
                <div className={`ws-engine${isLive ? ' is-live' : ''}`}>
                  <div className="ws-engine-top">
                    <span className="ws-engine-glyph">
                      <EngineGlyph slug={engine.slug} size={22} />
                    </span>
                    <div className="ws-engine-id">
                      <h3>{engine.name}</h3>
                      <div className="ws-engine-type">{engine.type}</div>
                    </div>
                  </div>
                  <p>{engine.description}</p>
                  <div className="ws-card-foot">
                    {isComingSoon ? (
                      <span className="ws-badge soon">Próximamente</span>
                    ) : isLive ? (
                      <span className="ws-badge live">
                        <span className="ws-pulse" />
                        {isTrial ? `Prueba ${trialDaysLeft}d` : 'En vivo'}
                      </span>
                    ) : (
                      <span className="ws-badge">Disponible</span>
                    )}
                    <span className="ws-go">
                      {isComingSoon ? 'Ver detalles' : 'Abrir'} <span className="ws-arrow">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Free users get one clear route to live execution, at the bottom where
          it reads as an offer rather than a wall. */}
      {tier === 'FREE' && (
        <section className="ws-section">
          <div className="ws-notice accent">
            <div className="ws-notice-body">
              <h3>Pon un engine en vivo</h3>
              <p>
                Pro ({TIER_CAPS.PRO.price}/{TIER_CAPS.PRO.per}) enciende el engine que elijas. VIP (
                {TIER_CAPS.VIP.price}/{TIER_CAPS.VIP.per}) los enciende todos.
              </p>
            </div>
            <Link href={'/app/subscription' as Route} className="ws-btn ws-btn-primary ws-btn-sm">
              Ver planes
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
