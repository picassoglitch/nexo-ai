// Platform-wide token usage aggregates for the admin overview.
// Server-only — uses the service-role client to bypass RLS (admin pages
// already check role + redirect non-admins before invoking).

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PlatformTokenStats {
  /** Total tokens spent this calendar month, summed across every user and engine. */
  monthTotal: number;
  /** Total spent in the last 7 rolling days. Strictly less than monthTotal
   *  early in the month and possibly larger than monthTotal late in the month
   *  if the 7-day window crosses the period boundary. */
  weekTotal: number;
  /** Total spent ever (since usage_events was first written to). Useful as a
   *  "lifetime" counter on the overview card. */
  allTimeTotal: number;
  /** Breakdown for the current calendar month, sorted by tokens desc. */
  byEngineThisMonth: Array<{
    engineId: string;
    engineSlug: string;
    engineName: string;
    tokens: number;
    /** Unique users who consumed any tokens on this engine this month. */
    activeUsers: number;
  }>;
  /** How many users have spent ≥1 token this month. Cheap "DAU/MAU"-style stat. */
  activeUsersThisMonth: number;
  /** Snapshot of the first instant of the period the monthTotal covers. */
  periodStart: string;
}

function currentPeriodStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function sevenDaysAgoIso(): string {
  const t = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString();
}

/** Aggregate token usage across every user + every engine.
 *
 *  We pull raw rows and aggregate in JS rather than using pg `sum` + `group by`
 *  because PostgREST doesn't expose aggregate queries directly without a
 *  view or RPC, and the data volume at our current scale (low thousands of
 *  events per user per month) is well within the "read everything and
 *  aggregate in Node" budget. If event count crosses ~1M rows we'll need a
 *  materialized view; until then this is the right trade-off. */
export async function getPlatformTokenStats(): Promise<PlatformTokenStats> {
  const admin = createAdminClient();
  const periodStart = currentPeriodStartIso();
  const weekStart = sevenDaysAgoIso();

  // Pull every llm.tokens event with the columns we need. No date filter —
  // we filter in JS so the same query feeds month + week + all-time totals.
  const { data: events, error } = await admin
    .from('usage_events')
    .select('amount, engine_id, user_id, occurred_at')
    .eq('kind', 'llm.tokens');

  if (error || !events) {
    if (error) console.error('[platform-stats] events query failed:', error.message);
    return {
      monthTotal: 0,
      weekTotal: 0,
      allTimeTotal: 0,
      byEngineThisMonth: [],
      activeUsersThisMonth: 0,
      periodStart,
    };
  }

  // Resolve engine_id → slug + display name in one round-trip.
  const engineIds = Array.from(
    new Set(events.map((e) => e.engine_id as string).filter(Boolean)),
  );
  const engineMeta = new Map<string, { slug: string; name: string }>();
  if (engineIds.length > 0) {
    const { data: engineRows } = await admin
      .from('engines')
      .select('id, slug, name')
      .in('id', engineIds);
    for (const r of engineRows ?? []) {
      engineMeta.set(r.id as string, {
        slug: (r.slug as string) ?? '?',
        name: (r.name as string) ?? '?',
      });
    }
  }

  // Walk events once, accumulate everything we need.
  let monthTotal = 0;
  let weekTotal = 0;
  let allTimeTotal = 0;
  const byEngine = new Map<
    string,
    { tokens: number; users: Set<string> }
  >();
  const activeUsersThisMonth = new Set<string>();

  for (const e of events) {
    const amount = (e.amount as number | null) ?? 0;
    const engineId = (e.engine_id as string | null) ?? '';
    const userId = (e.user_id as string | null) ?? '';
    const occurred = (e.occurred_at as string | null) ?? '';
    allTimeTotal += amount;
    if (occurred >= weekStart) weekTotal += amount;
    if (occurred >= periodStart) {
      monthTotal += amount;
      if (userId) activeUsersThisMonth.add(userId);
      if (engineId) {
        const bucket = byEngine.get(engineId) ?? { tokens: 0, users: new Set<string>() };
        bucket.tokens += amount;
        if (userId) bucket.users.add(userId);
        byEngine.set(engineId, bucket);
      }
    }
  }

  const byEngineThisMonth = Array.from(byEngine.entries())
    .map(([engineId, agg]) => {
      const meta = engineMeta.get(engineId);
      return {
        engineId,
        engineSlug: meta?.slug ?? 'unknown',
        engineName: meta?.name ?? 'Engine eliminado',
        tokens: agg.tokens,
        activeUsers: agg.users.size,
      };
    })
    .sort((a, b) => b.tokens - a.tokens);

  return {
    monthTotal,
    weekTotal,
    allTimeTotal,
    byEngineThisMonth,
    activeUsersThisMonth: activeUsersThisMonth.size,
    periodStart,
  };
}
