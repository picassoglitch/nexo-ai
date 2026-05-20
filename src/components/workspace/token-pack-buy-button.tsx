'use client';

// Buy button for a token top-up pack. Mirrors the structure of the
// SubscriptionActions buttons: optimistic transition, MP redirect in same
// tab so the back_urls land on /app/usage cleanly.
//
// Failure visibility — previous version showed only a 2.6s toast on
// checkout error. Easy to miss; "nothing happened" was a common user
// report. Now the button also keeps an inline error pinned below itself
// (sticky until they retry), and logs to console for debugging from
// browser devtools.

import { useState, useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { createTokenPackCheckout } from '@/lib/payments/token-checkout-actions';

interface Props {
  packId: string;
  packLabel: string;
}

export function TokenPackBuyButton({ packId, packLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [stickyError, setStickyError] = useState<string | null>(null);
  const showToast = useWorkspace((s) => s.showToast);

  function onClick() {
    setStickyError(null);
    startTransition(async () => {
      const res = await createTokenPackCheckout(packId);
      if (!res.ok || !res.url) {
        const msg = res.error ?? 'No se pudo iniciar el checkout';
        // Three signals so the user can't miss it:
        // 1. Toast (familiar quick flash)
        // 2. Sticky inline message below the button (won't disappear)
        // 3. console.error with the raw response for devtools forensics
        showToast(`<b>Error</b> · ${msg}`);
        setStickyError(msg);
        console.error('[token-pack-checkout] failed', {
          packId,
          response: res,
        });
        return;
      }
      showToast(`Redirigiendo a Mercado Pago para <b>${packLabel}</b>…`);
      // Same-tab redirect — MP back_urls bring the user back to /app/usage.
      window.location.href = res.url;
    });
  }

  return (
    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        style={{
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
      {stickyError && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 93, 93, 0.08)',
            border: '1px solid var(--cc-red, #ff5d5d)',
            borderRadius: 7,
            fontSize: 11.5,
            color: 'var(--cc-red, #ff5d5d)',
            lineHeight: 1.45,
          }}
        >
          ▸ {stickyError}
        </div>
      )}
    </div>
  );
}
