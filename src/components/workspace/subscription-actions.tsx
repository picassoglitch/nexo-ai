'use client';

import { useState, useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { changeUserTier } from '@/lib/auth/tier-actions';
import type { SubscriptionTier } from '@/lib/auth/session';

const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  ALL_ACCESS: 'All-Access',
};

interface Props {
  initialTier: SubscriptionTier;
  userId: string;
  isAdmin: boolean;
}

export function SubscriptionActions({ initialTier, userId, isAdmin }: Props) {
  const [tier, setTier] = useState<SubscriptionTier>(initialTier);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useWorkspace((s) => s.showToast);

  async function changeTier(next: SubscriptionTier) {
    if (next === tier || isPending) return;
    setPendingTier(next);
    startTransition(async () => {
      const prev = tier;
      // Optimistic
      setTier(next);
      const res = await changeUserTier(userId, next);
      setPendingTier(null);
      if (!res.ok) {
        setTier(prev);
        showToast(`<b>Error</b> · ${res.error ?? 'no se pudo cambiar el plan'}`);
        return;
      }
      if (res.paymentRequired) {
        showToast(
          `Plan <b>${TIER_LABELS[next]}</b> activado en modo demo. El checkout real (Mercado Pago) se conecta en step 05.`,
        );
      } else if (next === 'FREE') {
        showToast(`Suscripción cambiada a <b>${TIER_LABELS[next]}</b>.`);
      } else {
        showToast(`Plan <b>${TIER_LABELS[next]}</b> activado.`);
      }
    });
  }

  function cancelSubscription() {
    if (tier === 'FREE') {
      showToast('Ya estás en el plan Free.');
      return;
    }
    if (
      !confirm(
        '¿Cancelar tu suscripción? Mantendrás el plan hasta el final del período actual.',
      )
    ) {
      return;
    }
    void changeTier('FREE');
  }

  const cards: Array<{
    id: SubscriptionTier;
    name: string;
    price: string;
    per: string;
    tagline: string;
    features: string[];
    featured?: boolean;
  }> = [
    {
      id: 'FREE',
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
      id: 'PRO',
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
      id: 'ALL_ACCESS',
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
      {isAdmin && (
        <div
          style={{
            padding: '10px 14px',
            border: '1px solid var(--cc-purple)',
            background: 'var(--cc-purple-g)',
            borderRadius: 9,
            fontSize: 12,
            color: 'var(--cc-txt-2)',
            marginBottom: 16,
          }}
        >
          ▸ <b>Modo admin</b> — los cambios de plan se aplican inmediatamente sin pasar por el
          checkout.
        </div>
      )}

      <div
        className="cc-mod-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
      >
        {cards.map((c) => {
          const isCurrent = c.id === tier;
          const isPendingHere = pendingTier === c.id;
          return (
            <div
              key={c.id}
              className="cc-mod-card"
              style={{
                borderColor: isCurrent
                  ? 'var(--cc-green)'
                  : c.featured
                    ? 'rgba(158,234,58,.3)'
                    : undefined,
                background: c.featured && !isCurrent ? 'rgba(158,234,58,.04)' : undefined,
                position: 'relative',
              }}
            >
              <div className="cc-mod-card-head">
                <span
                  className="cc-mod-tag"
                  style={{ fontSize: 13, color: 'var(--cc-txt)', fontWeight: 600 }}
                >
                  {c.name}
                </span>
                {isCurrent && <span className="cc-mod-badge gr">Tu plan</span>}
                {!isCurrent && c.featured && <span className="cc-mod-badge gr">El más elegido</span>}
              </div>
              <div
                style={{
                  fontFamily: 'var(--cc-disp), sans-serif',
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {c.price}
                <span
                  style={{
                    fontSize: 13,
                    color: 'var(--cc-txt-3)',
                    fontWeight: 500,
                    marginLeft: 4,
                  }}
                >
                  {c.per}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--cc-txt-3)', minHeight: 36 }}>
                {c.tagline}
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  padding: 0,
                }}
              >
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
                    <span
                      style={{
                        color: 'var(--cc-green)',
                        fontFamily: 'var(--cc-mono), monospace',
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => changeTier(c.id)}
                disabled={isCurrent || isPending}
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
                  cursor: isCurrent || isPending ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: isPending && !isPendingHere ? 0.5 : 1,
                }}
              >
                {isPendingHere
                  ? 'Procesando…'
                  : isCurrent
                    ? 'Plan actual'
                    : c.id === 'FREE'
                      ? 'Bajar a Free'
                      : `Cambiar a ${c.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {tier !== 'FREE' && (
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
