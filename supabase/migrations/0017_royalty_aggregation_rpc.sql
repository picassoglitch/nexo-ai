-- =====================================================================
-- Nexo AI — Move royalty + platform-stats aggregation to Postgres.
--
-- WHY THIS EXISTS:
--   The Supabase project (t4g.nano) was returning Cloudflare 522s with
--   origin_time ~19s. Cause: src/lib/usage/platform-stats.ts pulled EVERY
--   usage_events row matching `kind=llm.tokens` (no time bound) over
--   PostgREST and aggregated in Node. On nano this seq-scanned, transferred
--   thousands of rows, hung past the edge timeout, and the connection died.
--   Concurrent RSC rendering of /dashboard/overview + /dashboard/royalties
--   piled all three queries into a single ~13ms window, exhausting the
--   tiny connection budget.
--
-- WHAT THIS MIGRATION DOES:
--   1. Two SECURITY DEFINER RPCs that aggregate server-side. The Node code
--      goes from "fetch N rows → sum in JS" to "rpc() → tiny summary back".
--   2. Two partial indexes scoped to the hot WHERE clauses (kind='llm.tokens'
--      and partner_royalty_per_million_tokens_cents > 0). Smaller index =
--      faster fits-in-RAM scans on nano.
--   3. Per-function statement_timeout so any single call still has a hard
--      ceiling even if a bad query plan slips through.
--
-- EXPLAIN PLAN EXPECTATIONS (run in Supabase SQL Editor after apply):
--
--   EXPLAIN ANALYZE
--   SELECT * FROM public.compute_engine_royalties(
--     date_trunc('month', now())::timestamptz,
--     (date_trunc('month', now()) + interval '1 month')::timestamptz
--   );
--   → expect: HashAggregate → Hash Left Join → Index Scan on
--     usage_events_engine_kind_partial_idx (when active partner engines
--     exist) + Index Scan on engines_partner_royalty_partial_idx.
--     Should be <100ms on nano with ≤100k events.
--
--   EXPLAIN ANALYZE
--   SELECT * FROM public.compute_platform_token_stats(
--     date_trunc('month', now())::timestamptz,
--     (now() - interval '7 days')::timestamptz
--   );
--   → expect: Append of 4 Aggregate nodes. The "all_time" branch is a full
--     scan of usage_events_kind_llm_partial_idx; the month + week branches
--     are bitmap index scans on the same partial; per_engine branch
--     HashAggregates with a join to engines. <200ms on nano with ≤100k events.
--
-- Idempotent: re-runnable.
-- =====================================================================

-- ── 1. Indexes ──────────────────────────────────────────────────────────

-- Partial index on llm.tokens events alone. The existing 0013 index
-- usage_events_engine_idx (engine_id, occurred_at desc) covers all `kind`
-- values; this smaller partial fits more comfortably in RAM and the planner
-- prefers it when the WHERE clause matches.
CREATE INDEX IF NOT EXISTS usage_events_kind_llm_partial_idx
  ON public.usage_events (occurred_at)
  WHERE kind = 'llm.tokens';

CREATE INDEX IF NOT EXISTS usage_events_engine_kind_partial_idx
  ON public.usage_events (engine_id, occurred_at)
  WHERE kind = 'llm.tokens';

-- Filter index for the royalty engine pull. Existing engines schema has no
-- index on owner_user_id — the royalty fetch was doing a seq scan plus
-- runtime filter. Partial keeps the index tiny (one row per active partner).
CREATE INDEX IF NOT EXISTS engines_partner_royalty_partial_idx
  ON public.engines (owner_user_id)
  WHERE partner_royalty_per_million_tokens_cents > 0
    AND owner_user_id IS NOT NULL;

-- The (engine_id, period_start) index on engine_royalty_payouts already
-- exists from 0015 (engine_royalty_payouts_engine_idx). Adding IF NOT EXISTS
-- as a documented no-op so future readers see we considered it.
CREATE INDEX IF NOT EXISTS engine_royalty_payouts_engine_period_idx
  ON public.engine_royalty_payouts (engine_id, period_start);

-- ── 2. compute_engine_royalties RPC ────────────────────────────────────
-- One round-trip replaces: 1 engines query + 1 usage_events fetch + JS sum.
-- Returns one row per partner-owned royalty-eligible engine, with the
-- attributed token count + computed amount in cents.
CREATE OR REPLACE FUNCTION public.compute_engine_royalties(
  p_period_start timestamptz,
  p_period_end timestamptz
)
RETURNS TABLE (
  engine_id uuid,
  partner_user_id uuid,
  tokens_attributed bigint,
  amount_cents bigint,
  rate_per_million_cents integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '8s'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS engine_id,
    e.owner_user_id AS partner_user_id,
    COALESCE(SUM(u.amount), 0)::bigint AS tokens_attributed,
    -- Floor on integer division to never over-attribute (matches the JS
    -- math in royalties.ts before this refactor).
    FLOOR(
      COALESCE(SUM(u.amount), 0) * e.partner_royalty_per_million_tokens_cents / 1000000.0
    )::bigint AS amount_cents,
    e.partner_royalty_per_million_tokens_cents AS rate_per_million_cents
  FROM public.engines e
  LEFT JOIN public.usage_events u
    ON u.engine_id = e.id
    AND u.kind = 'llm.tokens'
    AND u.occurred_at >= p_period_start
    AND u.occurred_at <  p_period_end
  WHERE e.partner_royalty_per_million_tokens_cents > 0
    AND e.owner_user_id IS NOT NULL
  GROUP BY e.id, e.owner_user_id, e.partner_royalty_per_million_tokens_cents;
END;
$$;

-- ── 3. compute_platform_token_stats RPC ─────────────────────────────────
-- Replaces the unbounded fetch in platform-stats.ts. Returns 3 scalar rows
-- (all_time, month, week) plus N per_engine rows in a single round-trip.
-- The "scope" discriminator column lets the Node side route rows without
-- multiple RPC calls.
CREATE OR REPLACE FUNCTION public.compute_platform_token_stats(
  p_period_start timestamptz,
  p_week_start timestamptz
)
RETURNS TABLE (
  scope text,             -- 'all_time' | 'month' | 'week' | 'per_engine'
  engine_id uuid,         -- NULL for the 3 scalar rows
  engine_slug text,
  engine_name text,
  tokens bigint,
  active_users bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '8s'
AS $$
BEGIN
  RETURN QUERY
  -- All-time scalar
  SELECT
    'all_time'::text,
    NULL::uuid, NULL::text, NULL::text,
    COALESCE(SUM(amount), 0)::bigint,
    COUNT(DISTINCT user_id)::bigint
  FROM public.usage_events
  WHERE kind = 'llm.tokens'

  UNION ALL

  -- Month scalar
  SELECT
    'month'::text,
    NULL::uuid, NULL::text, NULL::text,
    COALESCE(SUM(amount), 0)::bigint,
    COUNT(DISTINCT user_id)::bigint
  FROM public.usage_events
  WHERE kind = 'llm.tokens'
    AND occurred_at >= p_period_start

  UNION ALL

  -- Week scalar
  SELECT
    'week'::text,
    NULL::uuid, NULL::text, NULL::text,
    COALESCE(SUM(amount), 0)::bigint,
    COUNT(DISTINCT user_id)::bigint
  FROM public.usage_events
  WHERE kind = 'llm.tokens'
    AND occurred_at >= p_week_start

  UNION ALL

  -- Per-engine breakdown for the current month. Joins engines for display
  -- name/slug so the caller doesn't need a second round-trip to hydrate.
  SELECT
    'per_engine'::text,
    u.engine_id,
    e.slug,
    e.name,
    COALESCE(SUM(u.amount), 0)::bigint,
    COUNT(DISTINCT u.user_id)::bigint
  FROM public.usage_events u
  JOIN public.engines e ON e.id = u.engine_id
  WHERE u.kind = 'llm.tokens'
    AND u.occurred_at >= p_period_start
  GROUP BY u.engine_id, e.slug, e.name;
END;
$$;

-- ── 4. Grants ───────────────────────────────────────────────────────────
-- Both RPCs are SECURITY DEFINER and run as the owner (postgres), so they
-- read past RLS. Anon callers have no business hitting these — only
-- authenticated admins should call them, and the application-layer admin
-- check stays in tier-actions.ts / royalty-actions.ts.
-- Service-role bypasses RLS and EXECUTE on any function it owns, so no
-- extra grant needed for the admin client.
REVOKE ALL ON FUNCTION public.compute_engine_royalties(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_platform_token_stats(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_engine_royalties(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_platform_token_stats(timestamptz, timestamptz) TO service_role;

COMMENT ON FUNCTION public.compute_engine_royalties(timestamptz, timestamptz) IS
  'Aggregate per-engine royalty accruals server-side for a [start, end) period. Replaces the previous JS-side aggregation in src/lib/usage/royalties.ts that was causing 522s on nano.';
COMMENT ON FUNCTION public.compute_platform_token_stats(timestamptz, timestamptz) IS
  'All-time + month + week + per-engine token totals in a single round-trip. Replaces the unbounded usage_events fetch in src/lib/usage/platform-stats.ts.';
