'use client';

// Buy button for a token top-up pack. Mirrors the structure of the
// SubscriptionActions buttons: optimistic transition, MP redirect in same
// tab so the back_urls land on /app/usage cleanly.

import { useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { createTokenPackCheckout } from '@/lib/payments/token-checkout-actions';

interface Props {
  packId: string;
  packLabel: string;
}

export function TokenPackBuyButton({ packId, packLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const showToast = useWorkspace((s) => s.showToast);

  function onClick() {
    startTransition(async () => {
      const res = await createTokenPackCheckout(packId);
      if (!res.ok || !res.url) {
        showToast(`<b>Error</b> · ${res.error ?? 'No se pudo iniciar el checkout'}`);
        return;
      }
      showToast(`Redirigiendo a Mercado Pago para <b>${packLabel}</b>…`);
      // Same-tab redirect — MP back_urls bring the user back to /app/usage.
      window.location.href = res.url;
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      style={{
        marginTop: 'auto',
        padding: '11px 18px',
        borderRadius: 9,
        border: 'none',
        background: pending ? 'var(--cc-bg-3)' : 'var(--cc-green)',
        color: pending ? 'var(--cc-txt-3)' : '#070809',
        fontFamily: 'inherit',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: pending ? 'wait' : 'pointer',
      }}
    >
      {pending ? 'Iniciando checkout…' : `Comprar ${packLabel} →`}
    </button>
  );
}
