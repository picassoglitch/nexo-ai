import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import {
  MONTHLY_OPERATING_COSTS,
  MP_EFFECTIVE_FEE_RATE,
  formatMxn,
  toMxnCents,
} from '@/lib/billing/operating-costs';

export const metadata = { title: 'Billing · P&L' };

interface PaymentRow {
  id: string;
  user_id: string;
  tier: 'FREE' | 'PRO' | 'VIP';
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

// Format an ISO date as "17 may" — short list-display.
function shortDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'es' ? 'es-MX' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
}

export default async function AdminBillingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defensive role-gate — parent dashboard layout already redirects non-admins,
  // but the financial data here is sensitive enough to double-check.
  const session = await getSessionUser();
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN')) {
    redirect('/app');
  }

  const supabase = await createClient();

  // Pull ALL payments — admins can see everything thanks to migration 0008's
  // `payments_select_admins` RLS policy.
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select('id, user_id, tier, amount_cents, currency, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const payments = (paymentsRaw ?? []) as PaymentRow[];

  // ── Revenue side (this month) ────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const approvedThisMonth = payments.filter(
    (p) => p.status === 'approved' && new Date(p.created_at) >= monthStart,
  );
  // Sum all approved payments this month, converting to MXN for comparison.
  const grossRevenueMxnCents = approvedThisMonth.reduce(
    (sum, p) =>
      sum + toMxnCents(p.amount_cents, (p.currency === 'MXN' ? 'MXN' : 'USD') as 'USD' | 'MXN'),
    0,
  );

  // ── MP fees (deducted from gross) ────────────────────────────────────
  const mpFeesMxnCents = Math.round(grossRevenueMxnCents * MP_EFFECTIVE_FEE_RATE);

  // ── Subscriber breakdown ─────────────────────────────────────────────
  // Count UNIQUE users with approved payments this month per tier.
  const payingUsers = new Map<string, 'PRO' | 'VIP'>();
  for (const p of approvedThisMonth) {
    if (p.tier !== 'FREE') payingUsers.set(p.user_id, p.tier);
  }
  const proCount = Array.from(payingUsers.values()).filter((t) => t === 'PRO').length;
  const allAccessCount = Array.from(payingUsers.values()).filter((t) => t === 'VIP').length;

  // ── Operating costs ──────────────────────────────────────────────────
  // Calculate dynamic MP fees row (replaces the seed 0 from the config file).
  const operatingCosts = MONTHLY_OPERATING_COSTS.map((c) =>
    c.id === 'mp_fees' ? { ...c, amountCents: mpFeesMxnCents, currency: 'MXN' as const } : c,
  );
  const totalCostMxnCents = operatingCosts.reduce(
    (sum, c) => sum + toMxnCents(c.amountCents, c.currency),
    0,
  );

  // ── Net P&L ─────────────────────────────────────────────────────────
  const netMxnCents = grossRevenueMxnCents - totalCostMxnCents;
  const marginPct = grossRevenueMxnCents > 0 ? (netMxnCents / grossRevenueMxnCents) * 100 : 0;

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Ingresos brutos · {now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</div>
          <div className={`cc-mod-stat-v ${grossRevenueMxnCents > 0 ? 'gr' : ''}`}>
            {formatMxn(grossRevenueMxnCents)}
          </div>
          <div className="cc-mod-stat-sub">
            {approvedThisMonth.length} pagos · {payingUsers.size} subscribers pagantes
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Costos operativos</div>
          <div className={`cc-mod-stat-v ${totalCostMxnCents > 0 ? 'am' : ''}`}>
            {formatMxn(totalCostMxnCents)}
          </div>
          <div className="cc-mod-stat-sub">infra · IA · email · fees MP</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Margen neto</div>
          <div
            className={`cc-mod-stat-v ${
              netMxnCents > 0 ? 'gr' : netMxnCents < 0 ? '' : ''
            }`}
            style={netMxnCents < 0 ? { color: 'var(--cc-red)' } : undefined}
          >
            {netMxnCents >= 0 ? formatMxn(netMxnCents) : `-${formatMxn(-netMxnCents)}`}
          </div>
          <div className="cc-mod-stat-sub">
            {grossRevenueMxnCents > 0
              ? `${marginPct.toFixed(1)}% margen sobre bruto`
              : 'sin ingresos todavía'}
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Subscribers pagantes</div>
          <div className="cc-mod-stat-v">{payingUsers.size}</div>
          <div className="cc-mod-stat-sub">
            {proCount} Pro · {allAccessCount} VIP
          </div>
        </div>
      </div>

      {/* ── Operating costs breakdown ────────────────────────────────── */}
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Costos operativos · estimado mensual</div>
        <div className="cc-mod-list">
          {operatingCosts.map((c) => (
            <div key={c.id} className="cc-mod-row">
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {c.provider}{' '}
                  <span
                    className="cc-mod-badge"
                    style={{
                      fontFamily: 'var(--cc-mono), monospace',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {c.currency}
                  </span>
                </div>
                <div className="cc-mod-sub">
                  {c.label} · {c.note}
                </div>
              </div>
              <div className="cc-mod-right">
                <b style={{ color: 'var(--cc-amber)' }}>
                  -{c.currency === 'MXN'
                    ? formatMxn(c.amountCents)
                    : `$${(c.amountCents / 100).toFixed(2)} USD`}
                </b>
                <span>
                  ≈ {formatMxn(toMxnCents(c.amountCents, c.currency))} MXN
                </span>
              </div>
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: 11.5,
            color: 'var(--cc-txt-4)',
            fontFamily: 'var(--cc-mono), monospace',
            marginTop: 10,
            paddingLeft: 4,
            lineHeight: 1.5,
          }}
        >
          ▸ Hardcoded por ahora. Para data real: cron que jale las APIs de
          billing de cada proveedor y escriba en una tabla <code>platform_costs</code>.
          MP fees son dinámicos (calculados sobre ingresos del mes).
        </p>
      </div>

      {/* ── Revenue side — recent payments received ──────────────────── */}
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Pagos recibidos · últimos 100</div>
        {payments.length === 0 ? (
          <div
            style={{
              padding: '32px 22px',
              border: '1px dashed var(--cc-line-2)',
              borderRadius: 'var(--cc-r-l)',
              textAlign: 'center',
              color: 'var(--cc-txt-3)',
              fontSize: 13,
            }}
          >
            Sin pagos registrados todavía.
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
              Aparecen automáticamente cuando MP confirma un cobro al subscriber.
            </span>
          </div>
        ) : (
          <div className="cc-mod-list">
            {payments.slice(0, 30).map((p) => {
              const isApproved = p.status === 'approved';
              return (
                <div key={p.id} className="cc-mod-row">
                  <div className="cc-mod-body">
                    <div className="cc-mod-name">
                      Plan {p.tier.replace('_', '-')}{' '}
                      <span className={`cc-mod-badge ${isApproved ? 'gr' : 'am'}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="cc-mod-sub">
                      {shortDate(p.created_at, locale)} · user{' '}
                      <code>{p.user_id.slice(0, 8)}…</code>
                    </div>
                  </div>
                  <div className="cc-mod-right">
                    <b className={isApproved ? 'gr' : undefined}>
                      {p.currency === 'MXN'
                        ? formatMxn(p.amount_cents)
                        : `$${(p.amount_cents / 100).toFixed(2)}`}
                    </b>
                    <span>{p.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="cc-mod-section">
        <p
          style={{
            fontSize: 11.5,
            color: 'var(--cc-txt-4)',
            fontFamily: 'var(--cc-mono), monospace',
            lineHeight: 1.55,
          }}
        >
          ▸ Tipo de cambio USD→MXN hardcodeado a 17 MXN/USD para la conversión
          mostrada. Actualízalo si el peso se mueve fuerte — esto es vista de
          dirección, no contabilidad fiscal.
        </p>
      </div>
    </div>
  );
}
