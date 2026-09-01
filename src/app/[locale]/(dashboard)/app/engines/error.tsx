'use client';

import type { Route } from 'next';
import { Link } from '@/i18n/routing';

// Route-level error boundary for the engines hub. Catches a failed catalog /
// balance fetch and offers a retry instead of bubbling to the generic app
// error page. Keeps the user inside the workspace chrome.

export default function EnginesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="ws-empty">
      <div className="ws-empty-ic" aria-hidden="true">
        ⚠
      </div>
      <h3>No pudimos cargar tus engines</h3>
      <p>
        Hubo un problema al traer el catálogo. Reinténtalo en un momento — si sigue pasando,
        escríbenos por Mensajes y lo revisamos.
      </p>
      <div className="ws-btn-row" style={{ justifyContent: 'center', marginTop: 20 }}>
        <button type="button" className="ws-btn ws-btn-primary" onClick={reset}>
          Reintentar
        </button>
        <Link href={'/app/messages' as Route} className="ws-btn ws-btn-ghost">
          Avisarnos
        </Link>
      </div>
    </div>
  );
}
