// /app/usage — token balance + activity feed + buy-token-pack tiles.
//
// Hardening pass: this page kept 500'ing on action-POST re-renders ("Server
// Components render" error in production). Root cause was multiple
// data-fetch surfaces that could throw OUTSIDE of try/catch:
//
//   1. getSessionUser() — calls createClient() which throws on missing
//      env vars, then queries profiles which can throw on RLS / dropped
//      connection.
//   2. setRequestLocale(locale) — throws if locale is an unsupported value.
//   3. createClient() in the page body — same throw conditions.
//   4. Inline supabase.from(...) chains — throw on network / auth glitch.
//
// New architecture: all data fetching lives in a single async function
// `loadUsagePageData()` that returns a SAFE shape with sane defaults on
// every error path. The page render uses whatever that function returns
// — it can never throw because every external call is wrapped.
//
// Net effect: the page WILL render even if migrations are behind, RLS is
// misconfigured, env vars are missing, or Supabase is rate-limiting. In
// the worst case the user sees "Aún no tienes consumo registrado" with
// zero balance. A second-level error.tsx in the parent dir is still the
// backstop for anything I haven't anticipated.

import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser, type SubscriptionTier, type UserRole } from '@/lib/auth/session';
import { effectiveTier, isAdminRole } from '@/lib/billing/tiers';
import { getTokenBalance, type TokenBalance } from '@/lib/usage/tokens';
import { createClient } from '@/lib/supabase/server';
import { TokenPackBuyButton } from '@/components/workspace/token-pack-buy-button';
import { TOKEN_PACKS } from '@/lib/payments/pricing';
import {
  getCurrentAccrualsForPartner,
  getPayoutsForPartner,
  type PayoutRow,
  type RoyaltyAccrual,
} from '@/lib/usage/royalties';

export const metadata = { title: 'Uso' };

interface UsageEventRow {
  id: string;
  engine_id: string;
  kind: string;
  amount: number;
  occurred_at: string;
  operation: string | null;
}

// One "run" = group of usage events sharing (engine_id, operation, date).
// Renders as a single row showing total cost + call count. Events without
// an operation tag render individually (one row each), same as before.
interface RunGroup {
  key: string;
  engineId: string;
  operation: string;
  occurredAt: string;
  count: number;
  totalAmount: number;
  kinds: Set<string>;
}

interface PageData {
  /** True when getSessionUser() succeeded AND returned a user. */
  hasSession: boolean;
  userId: string | null;
  role: UserRole;
  tier: SubscriptionTier;
  isAdmin: boolean;
  balance: TokenBalance;
  events: UsageEventRow[];
  engineMap: Map<string, { name: string; icon: string }>;
  royaltyAccruals: RoyaltyAccrual[];
  royaltyPayouts: PayoutRow[];
  /** When any of the fetches errored, the operator-visible reason. Logged
   *  to Vercel Functions logs but NOT shown to the user — the surface
   *  silently degrades to default values instead. */
  warnings: string[];
}

const DEFAULT_BALANCE: TokenBalance = {
  remaining: 0,
  unlimited: false,
  monthlyAllocation: 0,
  bonus: 0,
  monthlyUsed: 0,
  periodStart: new Date().toISOString(),
};

const KIND_LABEL: Record<string, string> = {
  'llm.tokens': 'LLM tokens',
  'storage.mb': 'Storage',
  'publish.count': 'Publish',
};

function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

function relativeDate(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Load every piece of data the page needs, with bulletproof error handling.
 * Each external call is independently try/caught — a failure in one doesn't
 * cascade. Returns a PageData object the render layer can consume without
 * ever encountering an undefined property.
 *
 * Errors are accumulated in `warnings` and console.error'd with a
 * `[/app/usage]` prefix so they're greppable in Vercel Function logs.
 */
async function loadUsagePageData(): Promise<PageData> {
  const warnings: string[] = [];

  // ── Session ─────────────────────────────────────────────────────────
  // The ONE thing we don't catch is the not-authenticated case — when
  // there's no session at all, the caller should redirect to /sign-in.
  // The try/catch here covers a thrown auth error (createClient missing
  // env vars, supabase auth fetch network error, etc).
  let session: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    session = await getSessionUser();
  } catch (err) {
    console.error('[/app/usage] getSessionUser threw:', err);
    warnings.push('session_lookup_failed');
  }

  if (!session) {
    return {
      hasSession: false,
      userId: null,
      role: 'VIEWER',
      tier: 'FREE',
      isAdmin: false,
      balance: DEFAULT_BALANCE,
      events: [],
      engineMap: new Map(),
      royaltyAccruals: [],
      royaltyPayouts: [],
      warnings,
    };
  }

  const userId = session.user.id;
  const role = session.role;
  const storedTier = session.tier;
  const tier = effectiveTier(role, storedTier);
  const isAdmin = isAdminRole(role);

  // ── Balance + royalties (parallel) ──────────────────────────────────
  const [balance, royaltyAccruals, royaltyPayouts] = await Promise.all([
    getTokenBalance(userId).catch((err) => {
      console.error('[/app/usage] getTokenBalance threw:', err);
      warnings.push('balance_lookup_failed');
      return DEFAULT_BALANCE;
    }),
    getCurrentAccrualsForPartner(userId).catch((err) => {
      console.error('[/app/usage] getCurrentAccrualsForPartner threw:', err);
      warnings.push('royalty_accruals_lookup_failed');
      return [] as RoyaltyAccrual[];
    }),
    getPayoutsForPartner(userId).catch((err) => {
      console.error('[/app/usage] getPayoutsForPartner threw:', err);
      warnings.push('royalty_payouts_lookup_failed');
      return [] as PayoutRow[];
    }),
  ]);

  // ── Usage events ────────────────────────────────────────────────────
  // Defensive supabase client init.
  let events: UsageEventRow[] = [];
  const engineMap = new Map<string, { name: string; icon: string }>();
  try {
    const supabase = await createClient();
    // Try with `operation` column (migration 0015). On column-missing
    // error code 42703, fall back to legacy columns so the activity feed
    // still renders ungrouped.
    let rawEvents: unknown[] | null = null;
    try {
      const first = await supabase
        .from('usage_events')
        .select('id, engine_id, kind, amount, occurred_at, operation')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false })
        .limit(60);
      if (first.error) {
        console.warn(
          '[/app/usage] usage_events with operation failed, retrying legacy:',
          first.error.message,
        );
        const legacy = await supabase
          .from('usage_events')
          .select('id, engine_id, kind, amount, occurred_at')
          .eq('user_id', userId)
          .order('occurred_at', { ascending: false })
          .limit(60);
        if (legacy.error) {
          console.error('[/app/usage] usage_events legacy also failed:', legacy.error.message);
          warnings.push('events_query_failed');
        } else {
          rawEvents = legacy.data;
        }
      } else {
        rawEvents = first.data;
      }
    } catch (err) {
      console.error('[/app/usage] usage_events query threw:', err);
      warnings.push('events_query_threw');
    }
    events = (rawEvents ?? []) as UsageEventRow[];

    // Hydrate engine names from the events we got back.
    const engineIds = Array.from(new Set(events.map((e) => e.engine_id).filter(Boolean)));
    if (engineIds.length > 0) {
      try {
        const enginesRes = await supabase
          .from('engines')
          .select('id, name, icon')
          .in('id', engineIds);
        if (enginesRes.error) {
          console.warn('[/app/usage] engines lookup error:', enginesRes.error.message);
          warnings.push('engines_lookup_failed');
        } else {
          for (const e of enginesRes.data ?? []) {
            engineMap.set(e.id as string, {
              name: (e.name as string) ?? 'Engine',
              icon: (e.icon as string | null) ?? '◆',
            });
          }
        }
      } catch (err) {
        console.error('[/app/usage] engines lookup threw:', err);
        warnings.push('engines_lookup_threw');
      }
    }
  } catch (err) {
    console.error('[/app/usage] createClient threw:', err);
    warnings.push('supabase_client_init_failed');
  }

  return {
    hasSession: true,
    userId,
    role,
    tier,
    isAdmin,
    balance,
    events,
    engineMap,
    royaltyAccruals,
    royaltyPayouts,
    warnings,
  };
}

export default async function UsagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  // Param parsing — could throw if Next gives us a weird shape; default safely.
  let locale = 'es';
  let paymentStatus: string | undefined = undefined;
  try {
    const p = await params;
    locale = p.locale || 'es';
    const sp = await searchParams;
    paymentStatus = sp.status;
  } catch (err) {
    console.error('[/app/usage] params parsing failed:', err);
  }

  // setRequestLocale can throw if locale isn't in the supported list. We
  // accept whatever Next gave us but never let it crash the page.
  try {
    setRequestLocale(locale);
  } catch (err) {
    console.error('[/app/usage] setRequestLocale failed:', err);
  }

  const data = await loadUsagePageData();

  // No session = redirect to sign-in. `redirect()` throws internally
  // (intended NEXT_REDIRECT) and is the only error we WANT to bubble.
  if (!data.hasSession) {
    redirect('/sign-in?next=/app/usage');
  }

  // Collapse events into runs. Pure JS — no external calls, can't throw.
  type Row = { kind: 'run'; group: RunGroup } | { kind: 'event'; event: UsageEventRow };
  const runMap = new Map<string, RunGroup>();
  const standalone: UsageEventRow[] = [];
  for (const e of data.events) {
    if (!e.operation) {
      standalone.push(e);
      continue;
    }
    const date = (e.occurred_at || '').slice(0, 10);
    const key = `${e.engine_id}|${e.operation}|${date}`;
    const existing = runMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalAmount += e.amount;
      existing.kinds.add(e.kind);
      if (e.occurred_at < existing.occurredAt) existing.occurredAt = e.occurred_at;
    } else {
      runMap.set(key, {
        key,
        engineId: e.engine_id,
        operation: e.operation,
        occurredAt: e.occurred_at,
        count: 1,
        totalAmount: e.amount,
        kinds: new Set([e.kind]),
      });
    }
  }
  const rows: Row[] = [
    ...Array.from(runMap.values()).map((g) => ({ kind: 'run' as const, group: g })),
    ...standalone.map((e) => ({ kind: 'event' as const, event: e })),
  ].sort((a, b) => {
    const ta = a.kind === 'run' ? a.group.occurredAt : a.event.occurred_at;
    const tb = b.kind === 'run' ? b.group.occurredAt : b.event.occurred_at;
    return (tb || '').localeCompare(ta || '');
  });
  const visibleRows = rows.slice(0, 25);

  const now = new Date();
  const periodLabel = now.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  const { balance, isAdmin, tier, royaltyAccruals, royaltyPayouts, engineMap } = data;

  const usedPct = balance.unlimited
    ? 0
    : balance.monthlyAllocation > 0
      ? Math.min(100, (balance.monthlyUsed / balance.monthlyAllocation) * 100)
      : 0;
  const overSoon = !balance.unlimited && usedPct > 80;

  return (
    <>
      {/* Post-checkout return banner */}
      {paymentStatus === 'success' && (
        <div className="ws-notice accent ws-enter">
          <div className="ws-notice-body">
            <h3>Pago recibido</h3>
            <p>
              Tus tokens se suman a tu balance en cuanto Mercado Pago confirma el pago — de
              segundos a minutos.
            </p>
          </div>
        </div>
      )}

      <section className="ws-section">
        <div className="ws-grid ws-grid-3">
          <div className="ws-stat ws-enter" style={{ '--i': 1 } as React.CSSProperties}>
            <div className="ws-stat-l">Te quedan</div>
            <div className={`ws-stat-v${balance.unlimited || !overSoon ? ' acid' : ''}`}>
              {balance.unlimited ? '∞' : formatNumber(balance.remaining)}
            </div>
            <div className="ws-stat-sub">
              {balance.unlimited
                ? 'admin · sin límite'
                : `de ${formatNumber(balance.monthlyAllocation + balance.bonus)} este mes`}
            </div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 2 } as React.CSSProperties}>
            <div className="ws-stat-l">Tokens comprados</div>
            <div className="ws-stat-v">{formatNumber(balance.bonus)}</div>
            <div className="ws-stat-sub">
              {balance.bonus > 0 ? 'no caducan nunca' : 'aún no compras ninguno'}
            </div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="ws-stat-l">Periodo</div>
            <div className="ws-stat-v" style={{ fontSize: 24 }}>
              {periodLabel}
            </div>
            <div className="ws-stat-sub">
              plan {tier.replace('_', '-')} · se renueva el 1°
            </div>
          </div>
        </div>
      </section>

      {/* Consumption meter — the one number that decides whether you can run
          anything today, so it gets its own full-width block. */}
      {!balance.unlimited && (
        <section className="ws-section">
          <div className="ws-sl">Consumo del mes</div>
          <div className="ws-card">
            <div className="ws-usage-head">
              <span>
                {formatNumber(balance.monthlyUsed)} de{' '}
                {formatNumber(balance.monthlyAllocation)} tokens del plan
              </span>
              <span className={`ws-mono${overSoon ? ' ws-warn-text' : ''}`}>
                {Math.round(usedPct)}%
              </span>
            </div>
            <span className="ws-bar" style={{ display: 'block', width: '100%' }}>
              <span
                className={`ws-bar-fill${overSoon ? ' warn' : ''}`}
                style={{ width: `${usedPct}%` }}
              />
            </span>
            {overSoon && (
              <p className="ws-sub ws-warn-text" style={{ marginTop: 12 }}>
                Vas por encima del 80% de tu asignación mensual. Compra tokens extra abajo o sube
                de plan para no quedarte a media ejecución.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Buy top-up packs — hidden for admins */}
      {!isAdmin && (
        <section className="ws-section">
          <div className="ws-sl">Comprar tokens extra</div>
          <p className="ws-sub" style={{ marginBottom: 14, maxWidth: '64ch' }}>
            Los tokens que compras nunca caducan y se usan después de los que ya trae tu plan cada
            mes. Sirven en todos los engines.
          </p>
          <div className="ws-grid ws-grid-3">
            {TOKEN_PACKS.map((pack, i) => (
              <div
                key={pack.id}
                className="ws-card ws-pack ws-enter"
                style={{ '--i': i + 1 } as React.CSSProperties}
              >
                <div className="ws-card-head">
                  <h3>{pack.label}</h3>
                  <span className="ws-badge">
                    ${(pack.amountCents / 100).toLocaleString('es-MX')} MXN
                  </span>
                </div>
                <p>{pack.tagline}</p>
                <div className="ws-pack-meta">
                  <b>{formatNumber(pack.tokens)}</b> tokens ·{' '}
                  {(pack.amountCents / 100 / (pack.tokens / 1000)).toFixed(2)} MXN por 1k
                </div>
                <TokenPackBuyButton packId={pack.id} packLabel={pack.label} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partner royalty section — only renders if this user owns an
          engine with a non-zero royalty rate. */}
      {(royaltyAccruals.length > 0 || royaltyPayouts.length > 0) && (
        <section className="ws-section">
          <div className="ws-sl">Regalías de tus engines</div>
          <p className="ws-sub" style={{ marginBottom: 14, maxWidth: '64ch' }}>
            Como dueño de uno o más engines, ganas una regalía cada vez que otros usuarios gastan
            tokens en ellos. El equipo cierra el periodo al final del mes y procesa el pago.
          </p>
          {royaltyAccruals.length > 0 && (
            <div className="ws-list" style={{ marginBottom: 14 }}>
              {royaltyAccruals.map((a) => (
                <div key={a.engineId} className="ws-row">
                  <div className="ws-row-body">
                    <div className="ws-row-name">{a.engineName}</div>
                    <div className="ws-row-sub">
                      {formatNumber(a.tokensThisPeriod)} tokens este mes · $
                      {(a.ratePerMillionCents / 100).toLocaleString('es-MX')} por millón
                    </div>
                  </div>
                  <span className={`ws-badge${a.alreadyFinalized ? ' live' : ' warn'}`}>
                    {a.alreadyFinalized ? 'cerrado' : 'acumulando'}
                  </span>
                  <div className="ws-row-val">
                    ${(a.accruedCents / 100).toLocaleString('es-MX')} MXN
                  </div>
                </div>
              ))}
            </div>
          )}
          {royaltyPayouts.length > 0 && (
            <details className="ws-details">
              <summary>Historial de pagos ({royaltyPayouts.length})</summary>
              <div className="ws-list">
                {royaltyPayouts.map((p) => (
                  <div key={p.id} className="ws-row">
                    <div className="ws-row-body">
                      <div className="ws-row-name">{p.engineName}</div>
                      <div className="ws-row-sub">
                        {new Date(p.periodStart).toLocaleDateString('es-MX', {
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        · {formatNumber(p.tokensAttributed)} tokens
                        {p.paymentReference ? ` · ref ${p.paymentReference}` : ''}
                      </div>
                    </div>
                    <span className={`ws-badge${p.status === 'paid' ? ' live' : ''}`}>
                      {p.status}
                    </span>
                    <div className="ws-row-val">
                      ${(p.amountCents / 100).toLocaleString('es-MX')} MXN
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {/* Recent usage events — collapsed into runs when engine tags them. */}
      <section className="ws-section">
        <div className="ws-sl">Actividad reciente</div>
        {visibleRows.length === 0 ? (
          <div className="ws-empty">
            <div className="ws-empty-ic" aria-hidden="true">
              ◑
            </div>
            <h3>Sin consumo este mes</h3>
            <p>
              Tu actividad aparece aquí en cuanto un engine empiece a usar tokens — cuántos gastó,
              en qué y cuándo.
            </p>
          </div>
        ) : (
          <div className="ws-list">
            {visibleRows.map((row) => {
              if (row.kind === 'run') {
                const g = row.group;
                const eng = engineMap.get(g.engineId);
                return (
                  <div key={g.key} className="ws-row">
                    <div className="ws-row-body">
                      <div className="ws-row-name">{eng?.name ?? 'Engine'}</div>
                      <div className="ws-row-sub">
                        {relativeDate(g.occurredAt, locale)} · {g.operation} · {g.count} llamada
                        {g.count === 1 ? '' : 's'} ·{' '}
                        {Array.from(g.kinds)
                          .map((k) => KIND_LABEL[k] ?? k)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="ws-row-val">{formatNumber(g.totalAmount)} tokens</div>
                  </div>
                );
              }
              const e = row.event;
              const eng = engineMap.get(e.engine_id);
              return (
                <div key={e.id} className="ws-row">
                  <div className="ws-row-body">
                    <div className="ws-row-name">{eng?.name ?? 'Engine'}</div>
                    <div className="ws-row-sub">
                      {relativeDate(e.occurred_at, locale)} · {KIND_LABEL[e.kind] ?? e.kind}
                    </div>
                  </div>
                  <div className="ws-row-val">
                    {formatNumber(e.amount)} {e.kind.split('.')[1] ?? 'units'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Diagnostic strip — only when something actually went wrong. Lives at
          the bottom so it doesn't push the primary surface around. Helps the
          operator see which subsystem fell over without exposing internals. */}
      {data.warnings.length > 0 && (
        <p className="ws-diag">
          Algunos datos se mostraron con valores por defecto ({data.warnings.join(', ')}). Si esto
          sigue pasando, revisa los logs de Vercel — busca el prefijo `[/app/usage]`.
        </p>
      )}
    </>
  );
}
