import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';
import { listEngines } from '@/lib/data/engines';
import { CATS, ENV_LABEL, type EngineCategory } from '@/lib/data/types';
import { getTokenBalance } from '@/lib/usage/tokens';
import {
  engineIsLiveForUser,
  isNexoclipTrialActive,
  isNexoclipGraceActive,
  TIER_CAPS,
  effectiveTier,
  isAdminRole,
} from '@/lib/billing/tiers';
import { EnginesExplorer } from '@/components/workspace/engines/engines-explorer';
import {
  filterKeysFor,
  marketingFor,
  type EngineLiveState,
  type EngineVM,
} from '@/components/workspace/engines/engine-config';

// Browser tab → "Mis engines · Nexo AI" (template in [locale]/layout.tsx).
export const metadata = { title: 'Mis engines' };

// PARTNER ranks alongside PRO for tier-required gates (same level of access).
const TIER_LABEL_SHORT = { FREE: 'Free', PRO: 'Pro', PARTNER: 'Partner', VIP: 'VIP' } as const;
const TIER_ORDER = { FREE: 0, PRO: 1, PARTNER: 1, VIP: 2 } as const;
const CAT_LABEL = Object.fromEntries(CATS.map((c) => [c.id, c.label])) as Record<
  EngineCategory,
  string
>;

// Spotlight ordering inside the grid: featured first, then live, sim, locked,
// coming-soon — so the most actionable cards lead.
const STATE_RANK: Record<EngineLiveState, number> = {
  live: 1,
  trial: 1,
  simulation: 2,
  locked: 3,
  coming_soon: 4,
};

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

  // NexoClip trial (7-day) + post-trial grace (bonus tokens) — both let a FREE
  // user run NexoClip live. Mirror of the home/detail surfaces.
  const nowMs = new Date().getTime();
  const trialActive = isNexoclipTrialActive(session?.nexoclipTrialStartedAt ?? null, nowMs);
  const clipBonusTokens =
    session && tier === 'FREE'
      ? await getTokenBalance(session.user.id)
          .then((b) => (b.unlimited ? 0 : b.bonus))
          .catch(() => 0)
      : 0;
  const graceActive =
    tier === 'FREE' &&
    isNexoclipGraceActive(session?.nexoclipTrialStartedAt ?? null, nowMs, clipBonusTokens);

  // Build the serializable view-models the client explorer renders. Deprecated
  // engines are hidden from the hub (consistent with the home page).
  const vms: EngineVM[] = engines
    .filter((e) => e.status !== 'deprecated')
    .map((engine) => {
      const meetsTier = TIER_ORDER[tier] >= TIER_ORDER[engine.tierRequired];
      const isOwnedByMe =
        engine.ownerUserId !== null && engine.ownerUserId === session?.user.id;
      const isPlatformOwned = engine.ownerUserId === null;
      const isLive = engineIsLiveForUser({
        tier,
        engineId: engine.id,
        engineSlug: engine.slug,
        engineStatus: engine.status,
        meetsTier,
        selectedEngineId,
        isOwnedByUser: isOwnedByMe,
        trialActive,
        graceActive,
      });

      const state: EngineLiveState =
        engine.status === 'coming_soon'
          ? 'coming_soon'
          : isLive
            ? tier === 'FREE'
              ? 'trial'
              : 'live'
            : !meetsTier
              ? 'locked'
              : 'simulation';

      const { tagline, bullets } = marketingFor(engine.slug, engine.category, engine.description);

      return {
        id: engine.id,
        slug: engine.slug,
        name: engine.name,
        icon: engine.icon,
        type: engine.type,
        categoryLabel: CAT_LABEL[engine.category] ?? engine.category,
        state,
        filterKeys: filterKeysFor(state),
        tagline,
        bullets,
        requiresPlanLabel:
          engine.tierRequired !== 'FREE' ? TIER_LABEL_SHORT[engine.tierRequired] : null,
        meetsTier,
        isPlatformOwned,
        isOwnedByMe,
        ownerLabel: isPlatformOwned
          ? 'Nexo AI'
          : engine.ownerDisplayName || engine.ownerEmail?.split('@')[0] || 'Partner',
        envLabel: ENV_LABEL[engine.env],
        region: engine.region,
        featured: engine.slug === 'nexoclip' && engine.status === 'active',
        canSelectLive: tier === 'PRO' && engine.status === 'active' && meetsTier,
        isSelectedLive: engine.id === selectedEngineId,
      } satisfies EngineVM;
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return STATE_RANK[a.state] - STATE_RANK[b.state];
    });

  const liveCount = vms.filter((v) => v.state === 'live' || v.state === 'trial').length;
  const showOnboarding =
    tier === 'FREE' && vms.some((v) => v.slug === 'nexoclip' && v.state !== 'coming_soon');

  return (
    <div className="cc-scroll">
      <div className="pt-2">
        {vms.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[var(--cc-line-2)] p-14 text-center">
            <div className="text-[14px] font-semibold text-[var(--cc-txt-2)]">
              Sin engines disponibles
            </div>
            <div className="mt-2 text-[12px] text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
              Si eres admin: corre <b>0010_rename_bots_to_engines.sql</b> en Supabase y refresca.
            </div>
          </div>
        ) : (
          <EnginesExplorer engines={vms} liveCount={liveCount} showOnboarding={showOnboarding} />
        )}

        {/* Plan capabilities — compact reference strip */}
        {vms.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--cc-txt-4)] [font-family:var(--cc-mono),monospace]">
              Capacidades de tu plan · {caps.label}
              {!isAdmin && ` · ${caps.price}/${caps.per}`}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                {
                  k: 'Engines en vivo',
                  v: caps.liveEnginesCount === Infinity ? '∞' : String(caps.liveEnginesCount),
                },
                { k: 'Tokens IA / mes', v: caps.tokensPerMonth.toLocaleString('es-MX') },
                {
                  k: 'Almacenamiento',
                  v:
                    caps.storageMB >= 1000
                      ? `${caps.storageMB / 1000} GB`
                      : `${caps.storageMB} MB`,
                },
                { k: 'Historial', v: caps.historyDays >= 365 ? '1 año+' : `${caps.historyDays} días` },
                {
                  k: 'Soporte',
                  v: caps.hasPrioritySupport ? 'Prioritario' : tier === 'PRO' ? 'Email' : 'Comunidad',
                },
              ].map((row) => (
                <div
                  key={row.k}
                  className="rounded-[12px] border border-[var(--cc-line)] bg-[var(--cc-panel)] px-4 py-3"
                >
                  <div className="text-[18px] font-bold text-[var(--cc-txt)]">{row.v}</div>
                  <div className="mt-0.5 text-[11px] text-[var(--cc-txt-3)]">{row.k}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
