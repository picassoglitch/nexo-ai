'use client';

import { useState } from 'react';
import { useWorkspace } from '@/lib/workspace/store';

type Tier = 'free' | 'pro' | 'vip';

interface Props {
  initialTier: Tier;
}

const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  vip: 'All-Access',
};

export function SubscriptionActions({ initialTier }: Props) {
  const [tier, setTier] = useState<Tier>(initialTier);
  const [pending, setPending] = useState<Tier | null>(null);
  const showToast = useWorkspace((s) => s.showToast);

  async function changeTier(next: Tier) {
    if (next === tier) return;
    setPending(next);
    // TODO step 05-PAYMENTS: replace with real Mercado Pago checkout flow.
    // For now this only updates local state + flashes a confirmation.
    await new Promise((r) => setTimeout(r, 700));
    setTier(next);
    setPending(null);
    showToast(
      next === 'free'
        ? `Suscripción cambiada a <b>${TIER_LABELS[next]}</b>.`
        : `Plan <b>${TIER_LABELS[next]}</b> activado — pasaremos al checkout en step 05.`,
    );
  }

  function cancelSubscription() {
    if (tier === 'free') {
      showToast('Ya estás en el plan Free.');
      return;
    }
    if (!confirm('¿Cancelar tu suscripción? Mantendrás el plan hasta el final del período actual.')) {
      return;
    }
    void changeTier('free');
  }

  const cards: Array<{
    id: Tier;
    name: string;
    price: string;
    per: string;
    tagline: string;
    features: string[];
    featured?: boolean;
  }> = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      per: '/siempre',
      tagline: 'Explora la plataforma sin compromiso.',
      features: [
        'Cuenta Google completa',
        'Cualquier sistema en simulación',
        'Dashboard en vivo (solo lectura)',
        'Hasta 100 trabajos / mes',
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'USD $39',
      per: '/mes',
      tagline: 'Acceso en vivo a un sistema a tu elección.',
      featured: true,
      features: [
        'Todo lo de Free',
        'Un bot/agente/automatización en vivo',
        'Ejecución real · límites estándar',
        'Historial completo y analíticas',
        'Soporte por correo',
      ],
    },
    {
      id: 'vip',
      name: 'All-Access',
      price: 'USD $129',
      per: '/mes',
      tagline: 'Todos los sistemas desbloqueados.',
      features: [
        'Todo lo de Pro',
        'Todos los sistemas en vivo',
        'Los límites de uso más altos',
        'Acceso anticipado a nuevas herramientas',
        'Soporte prioritario',
      ],
    },
  ];

  return (
    <>
      <div className="cc-mod-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {cards.map((c) => {
          const isCurrent = c.id === tier;
          const isPending = pending === c.id;
          return (
            <div
              key={c.id}
              className="cc-mod-card"
              style={{
                borderColor: isCurrent ? 'var(--cc-green)' : c.featured ? 'rgba(158,234,58,.3)' : undefined,
                background: c.featured && !isCurrent ? 'rgba(158,234,58,.04)' : undefined,
                position: 'relative',
              }}
            >
              <div className="cc-mod-card-head">
                <span className="cc-mod-tag" style={{ fontSize: 13, color: 'var(--cc-txt)', fontWeight: 600 }}>
                  {c.name}
                </span>
                {isCurrent && <span className="cc-mod-badge gr">Tu plan</span>}
                {!isCurrent && c.featured && <span className="cc-mod-badge gr">El más elegido</span>}
              </div>
              <div style={{ fontFamily: 'var(--cc-disp), sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {c.price}
                <span style={{ fontSize: 13, color: 'var(--cc-txt-3)', fontWeight: 500, marginLeft: 4 }}>
                  {c.per}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--cc-txt-3)', minHeight: 36 }}>{c.tagline}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, padding: 0 }}>
                {c.features.map((f) => (
                  <li
                    key={f}
                    style={{
                      display: 'flex',
                      gap: 8,
                      fontSize: 12.5,
                      color: 'var(--cc-txt-2)',
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ color: 'var(--cc-green)', fontFamily: 'var(--cc-mono), monospace', flexShrink: 0 }}>
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => changeTier(c.id)}
                disabled={isCurrent || pending !== null}
                style={{
                  marginTop: 'auto',
                  padding: '11px 14px',
                  borderRadius: 9,
                  border: isCurrent ? '1px solid var(--cc-line-2)' : 'none',
                  background: isCurrent
                    ? 'transparent'
                    : c.featured
                      ? 'var(--cc-green)'
                      : 'var(--cc-bg-3)',
                  color: isCurrent ? 'var(--cc-txt-3)' : c.featured ? '#070809' : 'var(--cc-txt)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: isCurrent || pending !== null ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: pending !== null && !isPending ? 0.5 : 1,
                }}
              >
                {isPending
                  ? 'Procesando…'
                  : isCurrent
                    ? 'Plan actual'
                    : c.id === 'free'
                      ? 'Bajar a Free'
                      : `Cambiar a ${c.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {tier !== 'free' && (
        <div className="cc-mod-section">
          <div className="cc-mod-toggle">
            <div className="cc-mod-toggle-text">
              <span className="t">Cancelar suscripción</span>
              <span className="s">
                Mantendrás acceso a {TIER_LABELS[tier]} hasta el final del período actual.
              </span>
            </div>
            <button
              type="button"
              onClick={cancelSubscription}
              style={{
                background: 'transparent',
                border: '1px solid var(--cc-red)',
                color: 'var(--cc-red)',
                padding: '8px 14px',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancelar plan
            </button>
          </div>
        </div>
      )}
    </>
  );
}
