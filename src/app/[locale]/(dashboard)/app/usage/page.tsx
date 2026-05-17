import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { effectiveTier, isAdminRole } from '@/lib/billing/tiers';
import { getTokenBalance } from '@/lib/usage/tokens';
import { createClient } from '@/lib/supabase/server';
import { TokenPackBuyButton } from '@/components/workspace/token-pack-buy-button';
import { TOKEN_PACKS } from '@/lib/payments/pricing';

export const metadata = { title: 'Uso' };

interface UsageEventRow {
  id: string;
  engine_id: string;
  kind: string;
  amount: number;
  occurred_at: string;
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

  const [balance, supabase] = await Promise.all([
    getTokenBalance(session.user.id),
    createClient(),
  ]);

  // Last 20 usage events for this user across all engines + map engine_id → name.
  const { data: eventsRaw } = await supabase
    .from('usage_events')
    .select('id, engine_id, kind, amount, occurred_at')
    .eq('user_id', session.user.id)
    .order('occurred_at', { ascending: false })
    .limit(20);
  const events = (eventsRaw ?? []) as UsageEventRow[];
  const engineIds = Array.from(new Set(events.map((e) => e.engine_id)));
  const { data: enginesRaw } =
    engineIds.length > 0
      ? await supabase.from('engines').select('id, name, icon').in('id', engineIds)
      : { data: [] };
  const engineMap = new Map<string, { name: string; icon: string }>(
    (enginesRaw ?? []).map((e) => [
      e.id as string,
      { name: e.name as string, icon: (e.icon as string) ?? '◆' },
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

      {/* Recent usage events */}
      <div className="cc-mod-section">
        <div className="cc-mod-sl">Actividad reciente</div>
        {events.length === 0 ? (
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
            {events.map((e) => {
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
