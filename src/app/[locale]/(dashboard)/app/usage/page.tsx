import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { effectiveTier, isAdminRole } from '@/lib/billing/tiers';
import { getTokenBalance } from '@/lib/usage/tokens';
import { createClient } from '@/lib/supabase/server';
import { TokenPackBuyButton } from '@/components/workspace/token-pack-buy-button';
import { TOKEN_PACKS } from '@/lib/payments/pricing';
import {
  getCurrentAccrualsForPartner,
  getPayoutsForPartner,
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
  key: string; // engine_id + operation + date
  engineId: string;
  operation: string;
  occurredAt: string; // earliest in group
  count: number;
  totalAmount: number;
  kinds: Set<string>;
}

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

export default async function UsagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: paymentStatus } = await searchParams;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect('/sign-in?next=/app/usage');

  const role = session.role;
  const storedTier = session.tier;
  const tier = effectiveTier(role, storedTier);
  const isAdmin = isAdminRole(role);

  // Defensive: every external read wrapped in its own try so a missing
  // column (migration 0015 not applied) or a transient Supabase glitch
  // can't 500 the whole page. The previous version of this page assumed
  // royalty columns + the `operation` field on usage_events existed —
  // when prod was behind on migrations, the page crashed at SSR time.
  const balance = await getTokenBalance(session.user.id).catch(() => ({
    remaining: 0,
    unlimited: false,
    monthlyAllocation: 0,
    bonus: 0,
    monthlyUsed: 0,
    periodStart: new Date().toISOString(),
  }));
  const supabase = await createClient();
  const royaltyAccruals = await getCurrentAccrualsForPartner(session.user.id).catch(
    () => [],
  );
  const royaltyPayouts = await getPayoutsForPartner(session.user.id).catch(() => []);

  // Last 60 events. We over-fetch (vs. the prior 20) so the grouping has
  // enough source rows to surface meaningful runs even when a single
  // operation produces 5-10 individual LLM call events.
  //
  // Two-step query: first try with `operation` (migration 0015). If the
  // column doesn't exist yet on this deploy, fall back to the legacy
  // column set so the page still renders the activity feed (just
  // ungrouped). Wrapped in try/catch because Supabase-js can throw on
  // network / auth / RLS failures rather than just returning an error
  // object — and ANY unhandled throw inside a server component bubbles
  // up to Vercel as the generic "page couldn't load" 500 we saw in
  // the user's network tab.
  let eventsRaw: unknown[] | null = null;
  try {
    const firstTry = await supabase
      .from('usage_events')
      .select('id, engine_id, kind, amount, occurred_at, operation')
      .eq('user_id', session.user.id)
      .order('occurred_at', { ascending: false })
      .limit(60);
    if (firstTry.error) {
      // Most likely 42703 (column missing) — fall back to legacy columns.
      try {
        const fallback = await supabase
          .from('usage_events')
          .select('id, engine_id, kind, amount, occurred_at')
          .eq('user_id', session.user.id)
          .order('occurred_at', { ascending: false })
          .limit(60);
        eventsRaw = fallback.data;
      } catch {
        eventsRaw = [];
      }
    } else {
      eventsRaw = firstTry.data;
    }
  } catch {
    eventsRaw = [];
  }
  const events = (eventsRaw ?? []) as UsageEventRow[];

  // Collapse events into runs. Events with the same (engine, operation, date)
  // become a single row; events without an operation tag stay as
  // individual rows. Result is sorted newest-first across both groups.
  type Row = { kind: 'run'; group: RunGroup } | { kind: 'event'; event: UsageEventRow };
  const runMap = new Map<string, RunGroup>();
  const standalone: UsageEventRow[] = [];
  for (const e of events) {
    if (!e.operation) {
      standalone.push(e);
      continue;
    }
    const date = e.occurred_at.slice(0, 10);
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
    return tb.localeCompare(ta);
  });
  const visibleRows = rows.slice(0, 25);
  const engineIds = Array.from(new Set(events.map((e) => e.engine_id)));
  // Same defensive wrap pattern as the usage_events query above. If
  // Supabase throws (network / auth / column missing), we render with an
  // empty engineMap and the rows show fallback names. Beats a 500.
  let enginesRaw: unknown[] | null = [];
  if (engineIds.length > 0) {
    try {
      const result = await supabase.from('engines').select('id, name, icon').in('id', engineIds);
      enginesRaw = result.data;
    } catch {
      enginesRaw = [];
    }
  }
  const engineMap = new Map<string, { name: string; icon: string }>(
    ((enginesRaw ?? []) as Array<{ id: string; name: string; icon: string | null }>).map((e) => [
      e.id,
      { name: e.name, icon: e.icon ?? '◆' },
    ]),
  );

  // Period label — first of the month.
  const now = new Date();
  const periodLabel = now.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  // Bar fill percentage. For admins (unlimited), always 0% — no progress bar.
  const usedPct = balance.unlimited
    ? 0
    : balance.monthlyAllocation > 0
      ? Math.min(100, (balance.monthlyUsed / balance.monthlyAllocation) * 100)
      : 0;
  const overSoon = !balance.unlimited && usedPct > 80;

  return (
    <div className="cc-scroll">
      {/* Post-checkout return banner */}
      {paymentStatus === 'success' && (
        <div
          style={{
            padding: '14px 18px',
            border: '1px solid var(--cc-green)',
            background: 'var(--cc-green-g)',
            borderRadius: 'var(--cc-r-l)',
            marginBottom: 18,
            color: 'var(--cc-txt-2)',
            fontSize: 13,
          }}
        >
          ● <b style={{ color: 'var(--cc-green)' }}>Pago recibido</b> — los tokens entran a tu
          balance cuando Mercado Pago confirma (segundos hasta minutos). Esta página se actualiza
          sola.
        </div>
      )}

      {/* Top stats */}
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Período</div>
          <div className="cc-mod-stat-v">{periodLabel}</div>
          <div className="cc-mod-stat-sub">renueva el 1° del próximo mes</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Balance disponible</div>
          <div className={`cc-mod-stat-v ${balance.unlimited ? 'pu' : overSoon ? 'am' : 'gr'}`}>
            {balance.unlimited ? '∞' : formatNumber(balance.remaining)}
          </div>
          <div className="cc-mod-stat-sub">
            {balance.unlimited
              ? `admin · ilimitado (usado: ${formatNumber(balance.monthlyUsed)})`
              : `de ${formatNumber(balance.monthlyAllocation + balance.bonus)} tokens este mes`}
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Tokens bonus</div>
          <div className={`cc-mod-stat-v ${balance.bonus > 0 ? 'cy' : ''}`}>
            {formatNumber(balance.bonus)}
          </div>
          <div className="cc-mod-stat-sub">
            {balance.bonus > 0 ? 'top-ups comprados · no expiran' : 'sin top-ups comprados aún'}
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Plan</div>
          <div className="cc-mod-stat-v gr">{tier.replace('_', '-')}</div>
          <div className="cc-mod-stat-sub">
            {balance.unlimited
              ? 'sin límite por rol'
              : `incluye ${formatNumber(balance.monthlyAllocation)} tokens/mes`}
          </div>
        </div>
      </div>

      {/* Progress bar — hide for admins (no meaningful limit) */}
      {!balance.unlimited && (
        <div className="cc-mod-section">
          <div className="cc-mod-sl">Consumo del mes</div>
          <div
            style={{
              padding: '18px 20px',
              border: `1px solid var(--cc-line-2)`,
              background: 'var(--cc-panel)',
              borderRadius: 'var(--cc-r-l)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--cc-txt-2)' }}>
                <b>{formatNumber(balance.monthlyUsed)}</b> usados ·{' '}
                <b>{formatNumber(balance.remaining)}</b> disponibles
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontFamily: 'var(--cc-mono), monospace',
                  color: overSoon ? 'var(--cc-amber)' : 'var(--cc-txt-3)',
                }}
              >
                {usedPct.toFixed(1)}% gastado
              </span>
            </div>
            <span className="cc-bar-track" style={{ display: 'block', width: '100%' }}>
              <span
                className={`cc-bar-fill ${overSoon ? 'am' : 'gr'}`}
                style={{ width: `${usedPct}%` }}
              />
            </span>
            {overSoon && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: 'var(--cc-amber)',
                  fontFamily: 'var(--cc-mono), monospace',
                }}
              >
                ▸ Estás cerca del límite. Compra un top-up para no bloquearte cuando se acabe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Buy top-up packs — hidden for admins */}
      {!isAdmin && (
        <div className="cc-mod-section">
          <div className="cc-mod-sl">Comprar tokens extra</div>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--cc-txt-3)',
              maxWidth: '64ch',
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          >
            Los tokens comprados <b>nunca expiran</b> y se gastan <b>después</b> de tu allocation
            mensual. Disponibles en todos los engines (NexoClip y los que vengan después).
          </p>
          <div className="cc-mod-grid">
            {TOKEN_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="cc-mod-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <div className="cc-mod-card-head">
                  <h4 style={{ fontSize: 16 }}>{pack.label}</h4>
                  <span className="cc-mod-badge gr">
                    ${(pack.amountCents / 100).toLocaleString('es-MX')} MXN
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--cc-txt-3)', minHeight: 36 }}>
                  {pack.tagline}
                </p>
                <div className="cc-mod-meta">
                  <span>
                    <b>{formatNumber(pack.tokens)}</b> tokens
                  </span>
                  <span style={{ fontFamily: 'var(--cc-mono), monospace', fontSize: 10.5 }}>
                    ≈ ${((pack.amountCents / 100 / (pack.tokens / 1000)).toFixed(2))} MXN/1k tokens
                  </span>
                </div>
                <TokenPackBuyButton packId={pack.id} packLabel={pack.label} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Partner royalty section — only renders if this user owns an
          engine with a non-zero royalty rate. Shows live accruals for the
          current period + paid history. Hidden for everyone else. */}
      {(royaltyAccruals.length > 0 || royaltyPayouts.length > 0) && (
        <div className="cc-mod-section">
          <div className="cc-mod-sl">Royalties · tus engines</div>
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--cc-txt-3)',
              maxWidth: '64ch',
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          >
            Como owner de uno o más engines, acumulas regalías cada vez que
            otros usuarios consumen tokens en ellos. El admin finaliza el
            período al cierre del mes y procesa el pago offline.
          </p>
          {royaltyAccruals.length > 0 && (
            <div className="cc-mod-list" style={{ marginBottom: 14 }}>
              {royaltyAccruals.map((a) => (
                <div key={a.engineId} className="cc-mod-row">
                  <div className="cc-mod-ic">◆</div>
                  <div className="cc-mod-body">
                    <div className="cc-mod-name">
                      {a.engineName}{' '}
                      <span className="cc-mod-badge">
                        {a.alreadyFinalized ? 'finalizado' : 'acumulando'}
                      </span>
                    </div>
                    <div className="cc-mod-sub">
                      {formatNumber(a.tokensThisPeriod)} tokens este mes · rate{' '}
                      <code>
                        ${(a.ratePerMillionCents / 100).toLocaleString('es-MX')}/1M
                      </code>
                    </div>
                  </div>
                  <div className="cc-mod-right">
                    <b className={a.alreadyFinalized ? 'gr' : 'am'}>
                      ${(a.accruedCents / 100).toLocaleString('es-MX')}
                    </b>
                    <span>MXN este período</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {royaltyPayouts.length > 0 && (
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  color: 'var(--cc-txt-3)',
                  fontSize: 12.5,
                  marginBottom: 10,
                }}
              >
                Historial de pagos ({royaltyPayouts.length})
              </summary>
              <div className="cc-mod-list">
                {royaltyPayouts.map((p) => (
                  <div key={p.id} className="cc-mod-row">
                    <div className="cc-mod-ic">{p.status === 'paid' ? '✓' : p.status === 'cancelled' ? '✕' : '◷'}</div>
                    <div className="cc-mod-body">
                      <div className="cc-mod-name">
                        {p.engineName}{' '}
                        <span
                          className={`cc-mod-badge ${p.status === 'paid' ? 'gr' : ''}`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="cc-mod-sub">
                        Período{' '}
                        {new Date(p.periodStart).toLocaleDateString('es-MX', {
                          month: 'long',
                          year: 'numeric',
                        })}{' '}
                        · {formatNumber(p.tokensAttributed)} tokens
                        {p.paymentReference && (
                          <> · ref <code>{p.paymentReference}</code></>
                        )}
                      </div>
                    </div>
                    <div className="cc-mod-right">
                      <b className={p.status === 'paid' ? 'gr' : ''}>
                        ${(p.amountCents / 100).toLocaleString('es-MX')}
                      </b>
                      <span>MXN</span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Recent usage events — collapsed into runs when the engine tags
          them with an operation. Rows without an operation tag (legacy
          + non-operation-aware engines) render individually. */}
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Actividad reciente</div>
        {visibleRows.length === 0 ? (
          <div
            style={{
              padding: '32px 22px',
              border: '1px dashed var(--cc-line-2)',
              borderRadius: 'var(--cc-r-l)',
              textAlign: 'center',
              color: 'var(--cc-txt-3)',
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Aún no tienes consumo registrado este mes.
            <br />
            <span
              style={{
                color: 'var(--cc-txt-4)',
                fontSize: 11.5,
                fontFamily: 'var(--cc-mono), monospace',
                marginTop: 6,
                display: 'inline-block',
              }}
            >
              Tu actividad aparece aquí en cuanto un engine empiece a gastar tokens.
            </span>
          </div>
        ) : (
          <div className="cc-mod-list">
            {visibleRows.map((row) => {
              if (row.kind === 'run') {
                const g = row.group;
                const eng = engineMap.get(g.engineId);
                return (
                  <div key={g.key} className="cc-mod-row">
                    <div className="cc-mod-ic">{eng?.icon ?? '◆'}</div>
                    <div className="cc-mod-body">
                      <div className="cc-mod-name">
                        {eng?.name ?? 'Engine'}{' '}
                        <span className="cc-mod-badge">{g.operation}</span>{' '}
                        <span className="cc-mod-badge gr">
                          {g.count} llamada{g.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="cc-mod-sub">
                        {relativeDate(g.occurredAt, locale)} ·{' '}
                        {Array.from(g.kinds)
                          .map((k) => KIND_LABEL[k] ?? k)
                          .join(' · ')}
                      </div>
                    </div>
                    <div className="cc-mod-right">
                      <b className="cy">{formatNumber(g.totalAmount)}</b>
                      <span>tokens · run</span>
                    </div>
                  </div>
                );
              }
              const e = row.event;
              const eng = engineMap.get(e.engine_id);
              return (
                <div key={e.id} className="cc-mod-row">
                  <div className="cc-mod-ic">{eng?.icon ?? '◆'}</div>
                  <div className="cc-mod-body">
                    <div className="cc-mod-name">
                      {eng?.name ?? 'Engine'}{' '}
                      <span className="cc-mod-badge">{KIND_LABEL[e.kind] ?? e.kind}</span>
                    </div>
                    <div className="cc-mod-sub">{relativeDate(e.occurred_at, locale)}</div>
                  </div>
                  <div className="cc-mod-right">
                    <b>{formatNumber(e.amount)}</b>
                    <span>{e.kind.split('.')[1] ?? 'units'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
