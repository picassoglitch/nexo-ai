'use client';

import { useState, useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { changeUserTier } from '@/lib/auth/tier-actions';
import { createTierCheckout } from '@/lib/payments/checkout-actions';
import { TIER_CAPS } from '@/lib/billing/tiers';
import type { SubscriptionTier } from '@/lib/auth/session';

// Pull display labels straight from TIER_CAPS — single source of truth for
// names. Pricing strings ALSO come from TIER_CAPS below in the cards array.
const TIER_LABELS: Record<SubscriptionTier, string> = {
  FREE: TIER_CAPS.FREE.label,
  PRO: TIER_CAPS.PRO.label,
  PARTNER: TIER_CAPS.PARTNER.label,
  VIP: TIER_CAPS.VIP.label,
};

// Marketing copy that DOESN'T live in TIER_CAPS (taglines, feature bullets,
// "featured" flag for the recommended card). Pricing + name come from caps.
const TIER_MARKETING: Record<
  SubscriptionTier,
  { tagline: string; features: string[]; featured?: boolean }
> = {
  FREE: {
    tagline: 'Crea tu cuenta y prueba toda la plataforma gratis.',
    features: [
      'NexoClip gratis 7 días',
      '50,000 tokens IA de regalo',
      'Acceso a la comunidad',
      'Clips con marca de agua · descarga manual',
    ],
  },
  PRO: {
    tagline: 'Enciende el engine que quieras, en vivo.',
    featured: true,
    features: [
      'Todo lo de Free',
      '1 engine en vivo · tú eliges cuál',
      '1,000,000 de tokens / mes (se regeneran)',
      'NexoClip Pro: sin marca de agua · ~12 streams/mes · 1 brand kit',
      'Comunidad premium',
    ],
  },
  // PARTNER tier is admin-granted only — never shown as a buyable card.
  // We still need the entry so Record<SubscriptionTier, ...> typechecks
  // and the labels map can be indexed by any tier. The card-filtering
  // ORDER array below excludes it.
  PARTNER: {
    tagline: 'Programa de partners · solo por invitación.',
    features: [
      'Todo lo de Pro',
      'Tu propio engine siempre activo + 1 a elegir',
      'Historial extendido (180 días)',
      'Soporte prioritario',
      'Acceso anticipado a nuevas herramientas',
    ],
  },
  VIP: {
    tagline: 'Todo Nexo abierto — IA + Clip, sin límites.',
    features: [
      'Todo lo de Pro',
      'Todos los engines en vivo',
      '5× los tokens de Pro (5,000,000 / mes)',
      'Paquete completo de streamer de NexoClip',
      'Soporte prioritario · el equipo Nexo te ayuda a construir tu idea',
    ],
  },
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
  // Sticky error banner for the checkout failure path. The toast only
  // shows for ~2.5s and users miss it; this stays until they retry or
  // refresh. Common reason in production: MP_ACCESS_TOKEN unset on the
  // server, which returns reason='not_configured'.
  const [stickyError, setStickyError] = useState<string | null>(null);
  const showToast = useWorkspace((s) => s.showToast);

  async function changeTier(next: SubscriptionTier) {
    if (next === tier || isPending) return;
    setPendingTier(next);
    setStickyError(null);

    // Branch 1: Downgrades and admins go through direct tier-actions write.
    //  - Downgrade to FREE: no money changes hands, direct write.
    //  - Admin: their changes bypass MP (admin override).
    if (next === 'FREE' || isAdmin) {
      startTransition(async () => {
        const prev = tier;
        setTier(next); // optimistic
        const res = await changeUserTier(userId, next);
        setPendingTier(null);
        if (!res.ok) {
          setTier(prev);
          const msg = res.error ?? 'No pudimos cambiar tu plan.';
          showToast(`<b>Error</b> · ${msg}`);
          setStickyError(msg);
          return;
        }
        showToast(
          next === 'FREE'
            ? `Listo, tu plan ahora es <b>${TIER_LABELS[next]}</b>.`
            : `Plan <b>${TIER_LABELS[next]}</b> activado.`,
        );
      });
      return;
    }

    // Branch 2: Non-admin upgrading → Mercado Pago checkout.
    //  Returns a URL we redirect the browser to. After payment, MP fires the
    //  webhook which writes profiles.tier asynchronously; this user lands on
    //  /app/billing?status=success.
    startTransition(async () => {
      // Client-side timeout: if MP hangs and Vercel kills the function
      // (10s Hobby, 60s Pro), the useTransition would stay pending forever.
      // 18s = generous for a slow-but-working MP call, short enough that
      // we report the failure before Vercel's generic 500 page appears.
      const CLIENT_TIMEOUT_MS = 18_000;
      let timedOut = false;
      const timeoutPromise = new Promise<{ ok: false; error: string }>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          resolve({
            ok: false,
            error:
              'Mercado Pago no respondió en 18s. Posible causa: ' +
              'MP_ACCESS_TOKEN inválido o no configurado en Vercel.',
          });
        }, CLIENT_TIMEOUT_MS);
      });
      const res = await Promise.race([createTierCheckout(next), timeoutPromise]);
      if (!res.ok || !('url' in res) || !res.url) {
        setPendingTier(null);
        const msg =
          ('error' in res && res.error) || 'No pudimos abrir el pago.';
        showToast(`<b>Error</b> · ${msg}`);
        setStickyError(msg);
        console.error('[tier-checkout] failed', {
          targetTier: next,
          response: res,
          timedOut,
        });
        return;
      }
      // Don't reset pendingTier — the browser is about to navigate away.
      showToast(`Te llevamos a Mercado Pago…`);
      window.location.href = res.url;
    });
  }

  function cancelSubscription() {
    if (tier === 'FREE') {
      showToast('Ya tienes el plan Free.');
      return;
    }
    if (
      !confirm(
        '¿Cancelar tu suscripción? Conservas el plan hasta que termine el período que ya pagaste.',
      )
    ) {
      return;
    }
    void changeTier('FREE');
  }

  // Build cards by composing TIER_CAPS (name + price + per) with TIER_MARKETING
  // (tagline + features + featured). To change a price, only edit:
  //   - TIER_CAPS in src/lib/billing/tiers.ts  (display string)
  //   - TIER_PRICING in src/lib/payments/pricing.ts  (real MP cents)
  // To change feature bullets, edit TIER_MARKETING above.
  const ORDER: SubscriptionTier[] = ['FREE', 'PRO', 'VIP'];
  const cards = ORDER.map((id) => ({
    id,
    name: TIER_CAPS[id].label,
    price: TIER_CAPS[id].price,
    per: `/${TIER_CAPS[id].per}`,
    tagline: TIER_MARKETING[id].tagline,
    features: TIER_MARKETING[id].features,
    featured: TIER_MARKETING[id].featured,
  }));

  return (
    <>
      {isAdmin && (
        <div className="ws-notice info">
          <div className="ws-notice-body">
            <p>
              <b>Modo admin</b> — tus cambios de plan se aplican al instante, sin pasar por el
              pago.
            </p>
          </div>
        </div>
      )}

      {/* Sticky, dismissible: the toast lasts ~2.5s and users miss it. The
          usual production cause is MP_ACCESS_TOKEN unset on the server. */}
      {stickyError && (
        <div className="ws-notice warn">
          <div className="ws-notice-body">
            <h3>No pudimos abrir el pago</h3>
            <p>{stickyError}</p>
          </div>
          <button
            type="button"
            className="ws-icon-btn"
            onClick={() => setStickyError(null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      <div className="ws-grid ws-grid-3">
        {cards.map((c) => {
          const isCurrent = c.id === tier;
          const isPendingHere = pendingTier === c.id;
          return (
            <div
              key={c.id}
              className={`ws-plan${isCurrent ? ' is-current' : ''}${
                c.featured && !isCurrent ? ' is-featured' : ''
              }`}
            >
              <div className="ws-plan-head">
                <h3>{c.name}</h3>
                {isCurrent && <span className="ws-badge live">Tu plan</span>}
                {!isCurrent && c.featured && <span className="ws-badge">El más elegido</span>}
              </div>
              <div className="ws-plan-price">
                {c.price}
                <span>{c.per}</span>
              </div>
              <p className="ws-plan-tagline">{c.tagline}</p>
              <ul className="ws-plan-feats">
                {c.features.map((f) => (
                  <li key={f}>
                    <span aria-hidden="true">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => changeTier(c.id)}
                disabled={isCurrent || isPending}
                className={`ws-btn ws-btn-block ${
                  isCurrent ? 'ws-btn-ghost' : c.featured ? 'ws-btn-primary' : 'ws-btn-ghost'
                }`}
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
        <div className="ws-notice" style={{ marginTop: 20, marginBottom: 0 }}>
          <div className="ws-notice-body">
            <h3>Cancelar suscripción</h3>
            <p>
              Conservas tu acceso a {TIER_LABELS[tier]} hasta que termine el período que ya
              pagaste. Después bajas a Free sin cargo.
            </p>
          </div>
          <button type="button" className="ws-btn ws-btn-danger ws-btn-sm" onClick={cancelSubscription}>
            Cancelar plan
          </button>
        </div>
      )}
    </>
  );
}
