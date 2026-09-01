'use client';

// First-time welcome banner shown at the top of /app while the user hasn't
// accepted yet (server passes `claimed`). On accept:
//   1. call claimWelcomeGift() (marks claimed + starts the NexoClip trial)
//   2. hide the banner + fire confetti
//   3. after the confetti settles, router.refresh() so the stat cards (Tokens
//      IA balance, Engines en vivo count, engine cards) re-render with the
//      trial live — refreshing AFTER the animation instead of unmounting it
//      mid-flight.
//
// The component owns its own visibility so a refresh that flips `claimed` to
// true doesn't yank the confetti out from under itself.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/lib/workspace/store';
import { claimWelcomeGift } from '@/lib/usage/welcome-actions';
import { Confetti } from './confetti';

const CONFETTI_MS = 2400;

export function WelcomeGiftBanner({ claimed }: { claimed: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useWorkspace((s) => s.showToast);

  // Already accepted (server state) or accepted this session → render only the
  // confetti overlay if we're mid-celebration, nothing otherwise.
  if (claimed || dismissed) {
    return celebrating ? <Confetti durationMs={CONFETTI_MS} /> : null;
  }

  function accept() {
    startTransition(async () => {
      const res = await claimWelcomeGift();
      if (!res.ok) {
        showToast(`<b>Error</b> · ${res.error ?? 'no se pudo activar tu regalo'}`);
        return;
      }
      setDismissed(true);
      setCelebrating(true);
      // Let the confetti play, then refresh server state (trial now live).
      window.setTimeout(() => {
        setCelebrating(false);
        router.refresh();
      }, CONFETTI_MS);
    });
  }

  return (
    <div className="ws-notice accent ws-enter">
      <div className="ws-notice-body">
        <h3>Tu regalo de bienvenida está listo</h3>
        <p>
          50,000 tokens de IA para usar en cualquier engine este mes, más NexoClip Pro gratis por
          7 días — corriendo en vivo, sin tarjeta. Acéptalo para activarlo.
        </p>
      </div>
      <button
        type="button"
        className="ws-btn ws-btn-primary ws-btn-sm"
        onClick={accept}
        disabled={pending}
      >
        {pending ? 'Activando…' : 'Aceptar mi regalo'}
      </button>
    </div>
  );
}
