import { setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import Image from 'next/image';
import type { Route } from 'next';
import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { getSessionUser, type SubscriptionTier } from '@/lib/auth/session';
import { listEngines } from '@/lib/data/engines';
import { getTokenBalance } from '@/lib/usage/tokens';
import {
  engineIsLiveForUser,
  isNexoclipTrialActive,
  isNexoclipGraceActive,
  NEXOCLIP_TRIAL_SLUG,
  effectiveTier,
  isAdminRole,
} from '@/lib/billing/tiers';
import {
  ensureAdminEngineAccess,
  getEngineAccess,
} from '@/lib/engines/subscriptions';
import { EngineLaunchButton } from '@/components/workspace/engine-launch-button';
import { EngineReprovisionButton } from '@/components/workspace/engine-reprovision-button';

// Dynamic title: tab reads "NexoClip · Nexo AI", "NexoStreamManager · Nexo AI", etc.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const engines = await listEngines();
  const engine = engines.find((e) => e.slug === slug);
  return { title: engine?.name ?? 'Engine' };
}

// Per-engine workspace. Renders different content based on the engine + tier:
//   - Active + meets tier + Free       → simulation panel (mock controls)
//   - Active + meets tier + PRO/Above  → launch panel (real controls — placeholder for now)
//   - Active + above tier              → upgrade gate
//   - Coming-soon                      → notify-me panel
//   - Deprecated                       → 404 (deprecated engines are hidden from catalog)
//
// Real engine UIs (NexoClip's clip editor, StreamManager's dashboard) plug in
// here when those products ship. For v1 we render the metadata + the right
// CTA for the user's state, with a "Build phase" placeholder for the actual
// interface.

// PARTNER ranks alongside PRO for tier-required gates: they get PRO-equivalent
// access. The owned-engine override (always live) is handled separately in
// engineCanRunLive via the `isOwnedByUser` flag — engine.tier_required still
// applies to the engines a partner DOESN'T own.
const TIER_LABEL_SHORT = {
  FREE: 'Free',
  PRO: 'Pro',
  PARTNER: 'Partner',
  VIP: 'VIP',
} as const;
const TIER_ORDER = { FREE: 0, PRO: 1, PARTNER: 1, VIP: 2 } as const;

export default async function EngineWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect(`/sign-in?next=/app/engines/${slug}`);

  const engines = await listEngines();
  const engine = engines.find((e) => e.slug === slug);
  if (!engine || engine.status === 'deprecated') notFound();

  // NexoClip has a real brand lockup — show it as a hero banner and drop the
  // generic emoji icon box from the header (the lockup already brands the page).
  const isNexoclip = engine.slug === NEXOCLIP_TRIAL_SLUG;

  const role = session.role;
  const storedTier = session.tier;
  const tier = effectiveTier(role, storedTier);
  const isAdmin = isAdminRole(role);
  const meetsTier = TIER_ORDER[tier] >= TIER_ORDER[engine.tierRequired];
  // Partner-owned override: the engine's owner sees their own engine as
  // always-live (additive to any selected_engine_id they may also have).
  const isOwnedByMe =
    engine.ownerUserId !== null && engine.ownerUserId === session.user.id;
  // NexoClip 7-day trial grants live access regardless of tier — it bypasses
  // both the tier-required gate and the selection gate (NexoClip only). After
  // the trial, FREE users keep NexoClip live in "grace" while tokens remain.
  const nowMs = new Date().getTime();
  const trialActive = isNexoclipTrialActive(session.nexoclipTrialStartedAt, nowMs);
  const clipBonusTokens =
    tier === 'FREE' && engine.slug === NEXOCLIP_TRIAL_SLUG
      ? await getTokenBalance(session.user.id)
          .then((b) => (b.unlimited ? 0 : b.bonus))
          .catch(() => 0)
      : 0;
  const graceActive =
    tier === 'FREE' &&
    isNexoclipGraceActive(session.nexoclipTrialStartedAt, nowMs, clipBonusTokens);
  // NexoClip is "unlocked" (live, bypassing tier/selection) under either the
  // trial or the post-trial grace window.
  const clipUnlocked = (trialActive || graceActive) && engine.slug === NEXOCLIP_TRIAL_SLUG;
  const isLive = engineIsLiveForUser({
    tier,
    engineId: engine.id,
    engineSlug: engine.slug,
    engineStatus: engine.status,
    meetsTier,
    selectedEngineId: session.selectedEngineId,
    isOwnedByUser: isOwnedByMe,
    trialActive,
    graceActive,
  });
  const isComingSoon = engine.status === 'coming_soon';
  // Every engine gets a chip. Platform-owned (no partner_id) → "by Nexo AI"
  // muted; partner-owned → "by [name]" purple.
  const isPlatformOwned = engine.ownerUserId === null;
  const ownerLabel = isPlatformOwned
    ? 'Nexo AI'
    : engine.ownerDisplayName ||
      engine.ownerEmail?.split('@')[0] ||
      'Partner';

  // Lazy admin provisioning: admins have effective VIP via role
  // override, so they should auto-have engine access. If migration 0011's
  // backfill missed them (or a new engine was added after), create the row now.
  if (isAdmin && engine.status === 'active') {
    await ensureAdminEngineAccess(session.user.id, engine.id);
  }

  // Read the user's access record. Will be NULL for Free users (no access)
  // and for PRO users who haven't picked this engine as their live selection.
  const access = await getEngineAccess(session.user.id, engine.id);

  return (
    <>
      <div className="ws-back">
        <Link href={'/app/engines' as Route}>← Volver a mis engines</Link>
      </div>

      {/* NexoClip brand hero — full lockup. The logo's own dark background
          (#03040b) matches the banner fill, so the square reads as a floating
          mark rather than a pasted tile. */}
      {isNexoclip && (
        <div className="ws-brand-hero ws-enter">
          <Image
            src="/nexoclip-logo.png"
            alt="NexoClip — clips virales para streamers"
            width={240}
            height={240}
            priority
          />
        </div>
      )}

      <header className="ws-engine-head ws-enter">
        {!isNexoclip && (
          <span className="ws-engine-glyph ws-engine-glyph-lg" aria-hidden="true">
            {engine.icon}
          </span>
        )}
        <div className="ws-engine-head-id">
          <h2>{engine.name}</h2>
          <div className="ws-engine-type">
            {engine.type} · {isOwnedByMe ? 'tu engine' : `por ${ownerLabel}`}
          </div>
        </div>
        {isComingSoon ? (
          <span className="ws-badge soon">Próximamente</span>
        ) : isLive ? (
          <span className="ws-badge live">
            <span className="ws-pulse" />
            En vivo
          </span>
        ) : meetsTier ? (
          <span className="ws-badge">Disponible</span>
        ) : (
          <span className="ws-badge soon">Requiere {TIER_LABEL_SHORT[engine.tierRequired]}</span>
        )}
      </header>

      <p className="ws-engine-desc">{engine.description}</p>

      {/* Tier-state CTA panel */}
      {isComingSoon ? (
        <ComingSoonPanel engineName={engine.name} />
      ) : !meetsTier && !clipUnlocked ? (
        <UpgradeGatePanel engineName={engine.name} tierRequired={engine.tierRequired} />
      ) : isLive ? (
        <LaunchPanel
          engineId={engine.id}
          engineName={engine.name}
          integrationMode={engine.integrationMode}
          mode="live"
        />
      ) : (
        <LaunchPanel
          engineId={engine.id}
          engineName={engine.name}
          integrationMode={engine.integrationMode}
          mode="simulation"
          tier={tier}
          isAdmin={isAdmin}
        />
      )}

      {/* "Tu acceso" — engine subscription record. Shows when the user has
          a row in engine_subscriptions (PRO live selection, VIP seed,
          admin grant, or paid MP upgrade). Coming-soon engines never have access. */}
      {access && !isComingSoon && (
        <AccessPanel
          engineId={engine.id}
          engineName={engine.name}
          status={access.status}
          source={access.source}
          externalUserId={access.external_user_id}
          createdAt={access.created_at}
          requiresProvisioning={engine.requiresProvisioning}
        />
      )}

      <section className="ws-section">
        <div className="ws-sl">Detalles del engine</div>
        <div className="ws-grid ws-grid-4">
          <div className="ws-stat">
            <div className="ws-stat-l">Estado</div>
            <div className={`ws-stat-v${engine.status === 'active' ? ' acid' : ''}`}>
              {engine.status === 'active'
                ? 'Activo'
                : engine.status === 'coming_soon'
                  ? 'Próximamente'
                  : 'Retirado'}
            </div>
            <div className="ws-stat-sub">visible para tu plan</div>
          </div>
          <div className="ws-stat">
            <div className="ws-stat-l">Plan mínimo</div>
            <div className="ws-stat-v">{TIER_LABEL_SHORT[engine.tierRequired]}</div>
            <div className="ws-stat-sub">para correrlo en vivo</div>
          </div>
          <div className="ws-stat">
            <div className="ws-stat-l">Categoría</div>
            <div className="ws-stat-v" style={{ fontSize: 22 }}>
              {engine.category}
            </div>
            <div className="ws-stat-sub">{engine.type}</div>
          </div>
          <div className="ws-stat">
            <div className="ws-stat-l">Salud</div>
            <div className={`ws-stat-v${engine.state === 'HEALTHY' ? ' acid' : ''}`}>
              {engine.state === 'OFFLINE' ? '—' : `${engine.health}%`}
            </div>
            <div className="ws-stat-sub">
              {engine.state === 'OFFLINE' ? 'sin ejecución activa' : engine.state.toLowerCase()}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ── PANELS ────────────────────────────────────────────────────────────────

function LaunchPanel({
  engineId,
  engineName,
  integrationMode,
  mode,
  tier,
  isAdmin,
}: {
  engineId: string;
  engineName: string;
  integrationMode: 'internal_placeholder' | 'external_sso_redirect' | 'iframe_embed';
  mode: 'live' | 'simulation';
  tier?: SubscriptionTier;
  isAdmin?: boolean;
}) {
  const isLive = mode === 'live';
  // When the engine has a real external surface, the button does an SSO
  // redirect (signed token → engine validates → engine creates session). When
  // it doesn't (internal_placeholder), the button shows a toast explaining
  // that we're still pre-deploy.
  const hasExternalSurface = integrationMode !== 'internal_placeholder';

  return (
    <section className={`ws-panel${isLive ? ' is-live' : ''}`}>
      <div className="ws-panel-label">{isLive ? 'Modo en vivo' : 'Modo de prueba'}</div>
      <h3>
        {isLive
          ? `${engineName} está corriendo en vivo.`
          : `Prueba ${engineName} sin usar tus credenciales reales.`}
      </h3>
      <p>
        {isLive
          ? 'Cada trabajo descuenta de tu cuota mensual y los resultados se reflejan en tus integraciones externas.'
          : isAdmin
            ? 'Como admin estás viendo lo que vería un usuario Free. Para correrlo en vivo, usa el flujo normal de Pro o VIP.'
            : tier === 'FREE'
              ? 'En Free todos los engines corren con datos de prueba: sin riesgo y sin costo. Sube a Pro para ejecutarlo en vivo.'
              : 'Este engine no es el que tienes activo en vivo. Puedes cambiarlo desde Mis engines.'}
      </p>

      <div className="ws-btn-row">
        <EngineLaunchButton
          engineId={engineId}
          engineName={engineName}
          label={isLive ? `Abrir ${engineName}` : `Abrir prueba de ${engineName}`}
        />
        {!isLive && tier !== 'FREE' && (
          <Link href={'/app/engines' as Route} className="ws-btn ws-btn-ghost">
            Cambiar engine en vivo
          </Link>
        )}
      </div>

      <p className="ws-panel-foot">
        {hasExternalSurface
          ? `Abre ${engineName} en una pestaña nueva con sesión SSO firmada.`
          : `La interfaz de ${engineName} se conecta aquí cuando el engine esté publicado.`}
      </p>
    </section>
  );
}

function UpgradeGatePanel({
  engineName,
  tierRequired,
}: {
  engineName: string;
  tierRequired: SubscriptionTier;
}) {
  return (
    <section className="ws-panel is-gated">
      <div className="ws-panel-label">Necesitas otro plan</div>
      <h3>
        {engineName} requiere el plan {TIER_LABEL_SHORT[tierRequired]}.
      </h3>
      <p>
        Puedes verlo por dentro, pero para correrlo necesitas subir de plan. El cambio aplica al
        instante y puedes volver a bajar cuando quieras.
      </p>
      <div className="ws-btn-row">
        <Link href={'/app/subscription' as Route} className="ws-btn ws-btn-primary">
          Ver planes
        </Link>
      </div>
    </section>
  );
}

function AccessPanel({
  engineId,
  engineName,
  status,
  source,
  externalUserId,
  createdAt,
  requiresProvisioning,
}: {
  engineId: string;
  engineName: string;
  status: 'active' | 'paused' | 'cancelled';
  source: string;
  externalUserId: string | null;
  createdAt: string;
  requiresProvisioning: boolean;
}) {
  // Explain each `source` value in user-friendly language.
  const SOURCE_LABEL: Record<string, string> = {
    pro_selection: 'al elegir este engine como tu engine en vivo',
    all_access_seed: 'al activar tu plan VIP',
    admin_grant: 'concedido por el equipo',
    mp_payment: 'al confirmar tu pago en Mercado Pago',
    manual: 'manualmente',
  };
  const sourceText = SOURCE_LABEL[source] ?? source;
  const isInactive = status !== 'active';

  return (
    <section className="ws-section">
      <div className="ws-sl">Tu acceso a {engineName}</div>
      <div className={`ws-card${isInactive ? '' : ' is-live'}`}>
        <div className="ws-card-head">
          <h3>
            {status === 'active'
              ? 'Tu cuenta está lista'
              : status === 'paused'
                ? 'Tu cuenta está pausada'
                : 'Tu cuenta está cancelada'}
          </h3>
          {!isInactive && (
            <span className="ws-badge live">
              <span className="ws-pulse" />
              Activa
            </span>
          )}
        </div>
        <p>
          Tu cuenta de {engineName} se creó {sourceText} el{' '}
          {new Date(createdAt).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
          .
        </p>

        {externalUserId ? (
          <p className="ws-kv">
            Tu ID en {engineName}: <b>{externalUserId}</b>
          </p>
        ) : requiresProvisioning ? (
          // The row exists but external provisioning didn't complete (or never
          // ran — common for admins backfilled by migration 0011 before the
          // secrets existed). Offer a manual retry; the toast surfaces the real
          // reason on failure.
          <div className="ws-provision">
            <p className="ws-warn-text">
              La configuración quedó incompleta — todavía no tienes ID en {engineName}.
            </p>
            <EngineReprovisionButton engineId={engineId} engineName={engineName} />
            <details className="ws-details">
              <summary>Si el reintento falla</summary>
              <p className="ws-kv">
                Verifica que {engineName} esté corriendo en su URL; que{' '}
                <code>{`${engineName.toUpperCase().replace(/[^A-Z0-9]/g, '')}_ADMIN_TOKEN`}</code>{' '}
                en Vercel coincida con <code>NEXO_AI_ADMIN_TOKEN</code> en {engineName}; y que la
                URL en <code>engines.admin_api_base</code> apunte al endpoint correcto. El log del
                dev server (busca <code>[engine_subs]</code>) muestra el error exacto.
              </p>
            </details>
          </div>
        ) : (
          <p className="ws-kv">
            ID pendiente — se asigna cuando {engineName} abra su API de configuración.
          </p>
        )}
      </div>
    </section>
  );
}

function ComingSoonPanel({ engineName }: { engineName: string }) {
  return (
    <section className="ws-panel is-soon">
      <div className="ws-panel-label">Próximamente</div>
      <h3>{engineName} está en construcción.</h3>
      <p>
        Te avisamos por correo en cuanto lo lancemos. Mientras tanto, puedes usar los engines que
        ya están activos.
      </p>
      <div className="ws-btn-row">
        <Link href={'/app/engines' as Route} className="ws-btn ws-btn-ghost">
          Ver engines disponibles
        </Link>
      </div>
    </section>
  );
}
