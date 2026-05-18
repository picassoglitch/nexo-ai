// Single source of truth for what each subscription tier unlocks.
// Every UI badge, quota meter, server-side check, and paywall reads from here.
// Updating a tier's capabilities = edit this file. No magic numbers elsewhere.

import type { SubscriptionTier, UserRole } from '@/lib/auth/session';

/**
 * ROLE OVERRIDES TIER.
 * SUPER_ADMIN and ADMIN bypass all tier restrictions — they get ALL_ACCESS
 * capabilities regardless of what's stored in profiles.tier. The stored tier
 * is still shown on /app/subscription for billing transparency, but every
 * other surface (quotas, live-bot badges, paywalls) reads effectiveTier().
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function effectiveTier(role: UserRole, storedTier: SubscriptionTier): SubscriptionTier {
  if (isAdminRole(role)) return 'ALL_ACCESS';
  return storedTier;
}

/**
 * Is this tier the partner program tier?
 * Centralized so /app surfaces can render the "Partner · plus your own engine"
 * badge consistently without re-coding the comparison everywhere.
 */
export function isPartnerTier(tier: SubscriptionTier): boolean {
  return tier === 'PARTNER';
}

export interface TierCapabilities {
  /** How many engines the user can run in LIVE execution (not simulation).
   *  FREE = 0 (all simulation only).
   *  PRO = 1 (the engine they pick via profiles.selected_engine_id).
   *  ALL_ACCESS = Infinity (every engine in their org is live). */
  liveEnginesCount: number;
  /** Monthly job execution cap. */
  jobsPerMonth: number;
  /** Monthly AI token budget. */
  tokensPerMonth: number;
  /** Storage cap in MB for clips / VODs / uploads. */
  storageMB: number;
  /** Concurrent live streams allowed (0 = no live streaming, simulation only). */
  activeStreams: number;
  /** Historial retention in days. */
  historyDays: number;
  /** Whether advanced analytics dashboards unlock. */
  hasAdvancedAnalytics: boolean;
  /** Whether the user gets priority support. */
  hasPrioritySupport: boolean;
  /** Whether the user sees alpha / preview features. */
  hasEarlyAccess: boolean;
  /** Display labels. */
  label: string;
  price: string;
  per: string;
}

export const TIER_CAPS: Record<SubscriptionTier, TierCapabilities> = {
  FREE: {
    liveEnginesCount: 0,
    jobsPerMonth: 100,
    tokensPerMonth: 50_000,
    storageMB: 500,
    activeStreams: 0,
    historyDays: 7,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    hasEarlyAccess: false,
    label: 'Free',
    price: '$0',
    per: 'siempre',
  },
  PRO: {
    liveEnginesCount: 1,
    jobsPerMonth: 2_000,
    tokensPerMonth: 2_000_000,
    storageMB: 5_000,
    activeStreams: 1,
    historyDays: 90,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: false,
    hasEarlyAccess: false,
    label: 'Pro',
    price: 'MXN $749',
    per: 'mes',
  },
  // PARTNER = PRO + 1 owned engine. The owned engine is ALWAYS live regardless
  // of selected_engine_id (enforced in engineCanRunLive below), so the
  // effective live count is 2: their owned + the slot they pick. We keep
  // liveEnginesCount = 1 here because the value drives the *selectable* slot
  // count on /app surfaces — partners pick 1 like PRO does. The owned engine
  // is bonus capacity outside the slot mechanic.
  PARTNER: {
    liveEnginesCount: 1,
    jobsPerMonth: 2_000,
    tokensPerMonth: 2_000_000,
    storageMB: 5_000,
    activeStreams: 1,
    historyDays: 180,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasEarlyAccess: true,
    label: 'Partner',
    price: 'Programa',
    per: '',
  },
  ALL_ACCESS: {
    liveEnginesCount: Infinity,
    jobsPerMonth: 20_000,
    tokensPerMonth: 20_000_000,
    storageMB: 50_000,
    activeStreams: 5,
    historyDays: 365,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasEarlyAccess: true,
    label: 'All-Access',
    price: 'MXN $2,499',
    per: 'mes',
  },
};

/**
 * Returns whether a specific engine is allowed in LIVE mode for the given user state.
 * - FREE: never live.
 * - PRO: live if it's their selected_engine_id, else simulation.
 * - PARTNER: same as PRO for selection-slot mechanics, PLUS their owned engine
 *   is always live regardless of selection. Callers must pass `isOwnedByUser`
 *   so this function stays a pure predicate; the caller is responsible for
 *   joining engines.owner_user_id against the current user id.
 * - ALL_ACCESS: always live.
 *
 * Tier-required check is separate — even an ALL_ACCESS user can't activate
 * an engine marked tier_required = ALL_ACCESS if their effective tier is lower.
 * Callers should combine: engineCanRunLive(...) && tier >= engine.tierRequired.
 */
export function engineCanRunLive(
  tier: SubscriptionTier,
  engineId: string,
  selectedEngineId: string | null,
  isOwnedByUser: boolean = false,
): boolean {
  // Partner-owned engines short-circuit to always-live. The owned engine is
  // bonus capacity outside the selection mechanic — partners get their slot
  // AND their own.
  if (isOwnedByUser) return true;
  const caps = TIER_CAPS[tier];
  if (caps.liveEnginesCount === 0) return false;
  if (caps.liveEnginesCount === Infinity) return true;
  // PRO + PARTNER (or any finite > 0 case) — must match selection.
  return engineId === selectedEngineId;
}

// Back-compat alias — remove after all call sites migrated.
export { engineCanRunLive as botCanRunLive };

/** Pretty tier name for sidebar pills + headings. */
export function tierLabelShort(tier: SubscriptionTier): string {
  if (tier === 'ALL_ACCESS') return 'ALL-ACCESS';
  return tier; // 'FREE' | 'PRO' | 'PARTNER'
}

/** Quotas formatted as the UI list expects them. */
export interface QuotaRow {
  label: string;
  used: number;
  cap: number;
  unit: string;
  sub?: string;
}

export function buildQuotaRows(tier: SubscriptionTier): QuotaRow[] {
  const caps = TIER_CAPS[tier];
  return [
    {
      label: 'Trabajos IA · este mes',
      used: 0,
      cap: caps.jobsPerMonth,
      unit: 'trabajos',
      sub: 'Reinicia el día 1',
    },
    {
      label: 'Tokens IA · este mes',
      used: 0,
      cap: caps.tokensPerMonth,
      unit: 'tokens',
      sub: 'Across all sistemas',
    },
    {
      label: 'Almacenamiento',
      used: 0,
      cap: caps.storageMB,
      unit: 'MB',
      sub: 'Clips · VODs · uploads',
    },
    {
      label: 'Engines en vivo',
      used: 0,
      cap: caps.liveEnginesCount === Infinity ? 999 : caps.liveEnginesCount,
      unit: caps.liveEnginesCount === 0 ? 'engine en vivo · solo simulación' : 'engines',
      sub:
        tier === 'PRO'
          ? 'tú eliges cuál'
          : tier === 'FREE'
            ? 'upgrade a Pro'
            : tier === 'PARTNER'
              ? '1 a elegir · tu engine propio siempre activo'
              : 'todos disponibles',
    },
  ];
}
