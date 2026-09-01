'use client';

// Post-trial grace banner. Shown on /app once a FREE user's 7-day NexoClip
// trial has run out BUT they still have tokens left — we keep NexoClip live
// until those tokens are gone ("sabemos que tu tiempo se acabó, pero nos caes
// bien"). The live gate itself lives in engineIsLiveForUser via
// isNexoclipGraceActive; this component is purely the heads-up.
//
// Dismiss is local/session-only on purpose: there's no "claimed" state to
// persist — while the grace window holds (tokens > 0) the banner is allowed to
// reappear on a fresh load. Once tokens hit 0 the server stops rendering it.

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import type { Route } from 'next';

export function NexoclipGraceBanner({ tokensRemaining }: { tokensRemaining: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="ws-notice warn ws-enter">
      <div className="ws-notice-body">
        <h3>Tu prueba de NexoClip terminó — pero sigues adentro</h3>
        <p>
          Puedes seguir usando NexoClip en vivo hasta que se te acaben los tokens: te quedan{' '}
          {tokensRemaining.toLocaleString('es-MX')}. Si lo quieres sin que se acabe, pasa a Pro.
        </p>
      </div>
      <Link href={'/app/subscription' as Route} className="ws-btn ws-btn-primary ws-btn-sm">
        Ver planes
      </Link>
      <button
        type="button"
        className="ws-icon-btn"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
