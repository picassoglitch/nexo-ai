-- =====================================================================
-- Nexo AI — Move royalty + platform-stats aggregation to Postgres.
--
-- WHY THIS EXISTS:
--   The Supabase project (t4g.nano) was returning Cloudflare 522s with
--   origin_time ~19s. Cause: src/lib/usage/platform-stats.ts pulled EVERY
--   usage_events row matching `kind=llm.tokens` (no time bound) over
--   PostgREST and aggregated in Node. On nano this seq-scanned, transferred
--   thousands of rows, hung past the edge timeout, and the connection died.
--
-- WHAT THIS MIGRATION DOES:
--   1. Two SECURITY DEFINER RPCs that aggregate server-side.
--   2. Four partial indexes scoped to the hot WHERE clauses.
--   3. Per-function statement_timeout for safety.
--
-- HOW TO APPLY (IMPORTANT — read this first):
--
--   This file is split into 6 SECTIONS marked "── §N ──". Each section is a
--   single statement that you should paste into the Supabase SQL Editor
--   AND RUN ONE AT A TIME — not the whole file at once. Why:
--
--     - The four CREATE INDEX statements use CONCURRENTLY so they don't
--       block writers on usage_events while engines are pushing events.
--       CONCURRENTLY cannot be inside a transaction, so each must be its
--       own top-level statement.
--
--     - If you paste the whole file the SQL Editor wraps it in a tx and
--       the CONCURRENTLY statements fail with: "CREATE INDEX CONCURRENTLY
--       cannot run inside a transaction block".
--
--   IF YOU GET "connection terminated due to connection timeout" BEFORE THE
--   SQL EVEN RUNS: the project is still saturated from prior 522s. Go to
--   Project Settings → General → Restart project, wait 30s, try again.
--
--   IF A SINGLE INDEX HANGS PAST 60s: there's a long-running query holding
--   a SHARE lock. Run this in another tab to find it:
--     SELECT pid, query, state, age(now(), query_start) AS dur
--     FROM pg_stat_activity
--     WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
--     ORDER BY dur DESC LIMIT 10;
--   Then `SELECT pg_cancel_backend(<pid>);` the worst offender.
-- =====================================================================


-- ── §1 ── Partial index: usage_events (occurred_at) WHERE kind='llm.tokens'
-- Speeds up the all_time / month / week scans in compute_platform_token_stats.
-- Smaller than the existing usage_events_engine_idx (0013) because it only
-- includes rows with kind='llm.tokens', so it fits more comfortably in RAM on nano.
CREATE INDEX CONCURRENTLY IF NOT EXISTS usage_events_kind_llm_partial_idx
  ON public.usage_events (occurred_at)
  WHERE kind = 'llm.tokens';


-- ── §2 ── Partial index: usage_events (engine_id, occurred_at) WHERE kind='llm.tokens'
-- Speeds up the per-engine aggregation in compute_engine_royalties.
-- The leading engine_id column makes the join to engines a Nested Loop
-- with index lookups instead of a Hash Join over a full scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS usage_events_engine_kind_partial_idx
  ON public.usage_events (engine_id, occurred_at)
  WHERE kind = 'llm.tokens';


-- ── §3 ── Partial index: engines (owner_user_id) WHERE royalty rate > 0
-- The royalty engine filter was doing a seq scan + runtime filter on engines.
-- This partial is tiny (one row per active partner-eligible engine) so the
-- planner can use it to short-circuit the engines side of the LEFT JOIN.
CREATE INDEX CONCURRENTLY IF NOT EXISTS engines_partner_royalty_partial_idx
  ON public.engines (owner_user_id)
  WHERE partner_royalty_per_million_tokens_cents > 0
    AND owner_user_id IS NOT NULL;


-- ── §4 ── Documented no-op: (engine_id, period_start) on engine_royalty_payouts
-- The 0015 migration already created engine_royalty_payouts_engine_idx covering
-- this. Keeping the IF NOT EXISTS create so future readers see we considered it.
-- This one CAN run inside a normal transaction (no CONCURRENTLY needed) — we keep
-- the section break for consistency but you can paste it with §5/§6 if you want.
CREATE INDEX IF NOT EXISTS engine_royalty_payouts_engine_period_idx
  ON public.engine_royalty_payouts (engine_id, period_start);


-- ── §5 ── compute_engine_royalties RPC ──────────────────────────────────
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

REVOKE ALL ON FUNCTION public.compute_engine_royalties(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_engine_royalties(timestamptz, timestamptz) TO service_role;

COMMENT ON FUNCTION public.compute_engine_royalties(timestamptz, timestamptz) IS
  'Aggregate per-engine royalty accruals server-side for a [start, end) period. Replaces JS-side aggregation in src/lib/usage/royalties.ts that was causing 522s on nano.';


-- ── §6 ── compute_platform_token_stats RPC ─────────────────────────────
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

REVOKE ALL ON FUNCTION public.compute_platform_token_stats(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_platform_token_stats(timestamptz, timestamptz) TO service_role;

COMMENT ON FUNCTION public.compute_platform_token_stats(timestamptz, timestamptz) IS
  'All-time + month + week + per-engine token totals in a single round-trip. Replaces the unbounded usage_events fetch in src/lib/usage/platform-stats.ts.';
