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

export interface TierCapabilities {
  /** How many bots the user can run in LIVE execution (not simulation).
   *  FREE = 0 (all simulation only).
   *  PRO = 1 (the bot they pick via profiles.selected_bot_id).
   *  ALL_ACCESS = Infinity (every bot in their org is live). */
  liveBotsCount: number;
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
    liveBotsCount: 0,
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
    liveBotsCount: 1,
    jobsPerMonth: 2_000,
    tokensPerMonth: 2_000_000,
    storageMB: 5_000,
    activeStreams: 1,
    historyDays: 90,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: false,
    hasEarlyAccess: false,
    label: 'Pro',
    price: 'USD $39',
    per: 'mes',
  },
  ALL_ACCESS: {
    liveBotsCount: Infinity,
    jobsPerMonth: 20_000,
    tokensPerMonth: 20_000_000,
    storageMB: 50_000,
    activeStreams: 5,
    historyDays: 365,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    hasEarlyAccess: true,
    label: 'All-Access',
    price: 'USD $129',
    per: 'mes',
  },
};

/**
 * Returns whether a specific bot is allowed in LIVE mode for the given user state.
 * - FREE: never live.
 * - PRO: live if it's their selected_bot_id, else simulation.
 * - ALL_ACCESS: always live.
 */
export function botCanRunLive(
  tier: SubscriptionTier,
  botId: string,
  selectedBotId: string | null,
): boolean {
  const caps = TIER_CAPS[tier];
  if (caps.liveBotsCount === 0) return false;
  if (caps.liveBotsCount === Infinity) return true;
  // PRO (or any finite > 0 case) — must match selection.
  return botId === selectedBotId;
}

/** Pretty tier name for sidebar pills + headings. */
export function tierLabelShort(tier: SubscriptionTier): string {
  return tier === 'ALL_ACCESS' ? 'ALL-ACCESS' : tier;
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
      label: 'Sistemas en vivo',
      used: 0,
      cap: caps.liveBotsCount === Infinity ? 999 : caps.liveBotsCount,
      unit: caps.liveBotsCount === 0 ? 'sistema en vivo · solo simulación' : 'sistemas',
      sub: tier === 'PRO' ? 'tú eliges cuál' : tier === 'FREE' ? 'upgrade a Pro' : 'todos disponibles',
    },
  ];
}
