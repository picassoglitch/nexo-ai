'use client';

// Error boundary for the entire /app/* subtree.
//
// Whenever any server component below /app throws — Supabase down, a
// missing migration column, a typo in a downstream lib, ANY exception
// during SSR/RSC — Next.js renders THIS component instead of Vercel's
// generic "page couldn't load" screen. The user gets:
//
//   - A clear "algo se rompió en esta pantalla" message in our brand
//   - The Next.js error.digest (short hash) so they can paste it back
//     and the operator can grep Vercel logs to find the exact failure
//   - A "Recargar" button + a "Volver al inicio" escape hatch
//
// In dev (NODE_ENV !== 'production') we also render the raw error.message
// inline — leaks nothing in production builds where Next.js scrubs the
// message string to its digest.
//
// `error.tsx` files have a specific shape required by Next.js:
//   - 'use client' directive
//   - takes { error, reset } props
//   - the error has an optional .digest set by the framework
//
// Reference: https://nextjs.org/docs/app/building-your-application/routing/error-handling

import type { Route } from 'next';
import { Link } from '@/i18n/routing';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <div className="ws-empty ws-error">
      <div className="ws-empty-ic" aria-hidden="true">
        ⚠
      </div>
      <h3>Algo se rompió en esta pantalla</h3>
      <p>
        No es tu culpa y no perdiste nada. Recarga la página; si sigue pasando, escríbenos por
        Mensajes con el ID de abajo y lo revisamos.
      </p>

      {error.digest && (
        <p className="ws-kv">
          ID del error: <b>{error.digest}</b>
        </p>
      )}
      {isDev && error.message && <p className="ws-inline-error">{error.message}</p>}

      <div className="ws-btn-row" style={{ justifyContent: 'center', marginTop: 20 }}>
        <button type="button" className="ws-btn ws-btn-primary" onClick={reset}>
          Recargar
        </button>
        <Link href={'/app' as Route} className="ws-btn ws-btn-ghost">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
