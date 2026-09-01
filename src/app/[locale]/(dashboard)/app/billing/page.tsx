import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { getSessionUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/payments/pricing';
import type { SubscriptionTier } from '@/lib/auth/session';

export const metadata = { title: 'Pagos y facturas' };

interface PaymentRow {
  id: string;
  tier: SubscriptionTier;
  mp_payment_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
}

const TIER_LABEL: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  PARTNER: 'Partner',
  VIP: 'VIP',
};

// `cls` is a .ws-badge modifier: live = settled and good, warn = still moving,
// danger = it failed. Anything unmapped renders neutral.
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Aprobado', cls: 'live' },
  pending: { label: 'Pendiente', cls: 'warn' },
  in_process: { label: 'Procesando', cls: 'warn' },
  rejected: { label: 'Rechazado', cls: 'danger' },
  cancelled: { label: 'Cancelado', cls: 'danger' },
  refunded: { label: 'Reembolsado', cls: 'soon' },
  charged_back: { label: 'Contracargo', cls: 'danger' },
};

export default async function WorkspaceBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: returnedStatus } = await searchParams;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect('/sign-in?next=/app/billing');

  const supabase = await createClient();
  const { data: paymentsRaw } = await supabase
    .from('payments')
    .select('id, tier, mp_payment_id, amount_cents, currency, status, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const payments = (paymentsRaw ?? []) as PaymentRow[];

  const approved = payments.filter((p) => p.status === 'approved');
  const totalPaid = formatMoney(
    approved.reduce((sum, p) => sum + p.amount_cents, 0),
    payments[0]?.currency ?? 'USD',
  );

  return (
    <>
      {/* Post-checkout return banner — MP redirects here with ?status= */}
      {returnedStatus === 'success' && (
        <div className="ws-notice accent ws-enter">
          <div className="ws-notice-body">
            <h3>Pago recibido</h3>
            <p>
              Tu plan se activa en cuanto Mercado Pago confirma el pago — de segundos a minutos.
              Esta página se actualiza sola.
            </p>
          </div>
        </div>
      )}
      {returnedStatus === 'pending' && (
        <div className="ws-notice warn ws-enter">
          <div className="ws-notice-body">
            <h3>Pago pendiente</h3>
            <p>
              Mercado Pago todavía no lo confirma. Si pagaste en efectivo (OXXO o ticket), el
              dinero se acredita cuando el comercio lo procesa.
            </p>
          </div>
        </div>
      )}

      <section className="ws-section">
        <div className="ws-grid ws-grid-3">
          <div className="ws-stat ws-enter" style={{ '--i': 1 } as React.CSSProperties}>
            <div className="ws-stat-l">Total pagado</div>
            <div className="ws-stat-v">{totalPaid}</div>
            <div className="ws-stat-sub">solo los cargos aprobados</div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 2 } as React.CSSProperties}>
            <div className="ws-stat-l">Cargos aprobados</div>
            <div className="ws-stat-v">{approved.length}</div>
            <div className="ws-stat-sub">de {payments.length} registrados</div>
          </div>
          <div className="ws-stat ws-enter" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="ws-stat-l">Plan activo</div>
            <div className="ws-stat-v acid">{TIER_LABEL[session.tier]}</div>
            <div className="ws-stat-sub">
              <Link href={'/app/subscription' as Route} className="ws-go">
                Cambiar plan <span className="ws-arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-sl">Tus cargos</div>
        {payments.length === 0 ? (
          <div className="ws-empty">
            <div className="ws-empty-ic" aria-hidden="true">
              ▦
            </div>
            <h3>Todavía no tienes cargos</h3>
            <p>
              En el plan Free no pagas nada. Cuando actives Pro o VIP, cada cargo aparece aquí con
              su comprobante de Mercado Pago.
            </p>
            <Link href={'/app/subscription' as Route} className="ws-btn ws-btn-ghost">
              Ver planes
            </Link>
          </div>
        ) : (
          <div className="ws-list">
            {payments.map((p) => {
              const meta = STATUS_LABEL[p.status] ?? { label: p.status, cls: '' };
              const date = new Date(p.created_at).toLocaleDateString(
                locale === 'es' ? 'es-MX' : 'en-US',
                {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );
              return (
                <div key={p.id} className="ws-row">
                  <div className="ws-row-body">
                    <div className="ws-row-name">Plan {TIER_LABEL[p.tier]}</div>
                    <div className="ws-row-sub">
                      {date} · Mercado Pago #{p.mp_payment_id}
                    </div>
                  </div>
                  <span className={`ws-badge ${meta.cls}`}>{meta.label}</span>
                  <div className="ws-row-val">{formatMoney(p.amount_cents, p.currency)}</div>
                </div>
              );
            })}
          </div>
        )}
        <p className="ws-sub" style={{ marginTop: 12 }}>
          Los estados se actualizan solos cada vez que Mercado Pago nos avisa de un cambio.
        </p>
      </section>
    </>
  );
}
