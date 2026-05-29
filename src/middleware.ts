import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Only refresh Supabase auth cookies for routes that actually need them.
// The landing, /contacto, /sign-in, etc. are all public — making them wait on
// Supabase round-trips just to render is what caused the production 504s.
// We strip the locale prefix first so /es/app and /app both match.
function needsAuthRefresh(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(es|en)(?=\/|$)/, '');
  return (
    stripped.startsWith('/app') ||
    stripped.startsWith('/dashboard') ||
    stripped.startsWith('/account')
  );
}

// Hard wall on how long the Supabase token-refresh round-trip is allowed to
// block the middleware. Vercel's middleware invocation timeout is 25s. If we
// hit that, the WHOLE site 504s — including the unauthenticated landing.
// 4s is generous for a healthy Supabase + leaves headroom for the rest of
// the function (intl resolution + cookie writes). If Supabase is slow on a
// given request, we let it through with a stale cookie; the server-side
// getSessionUser() in app/dashboard layouts re-fetches anyway and will
// either return a fresh session or redirect to /sign-in.
const AUTH_REFRESH_TIMEOUT_MS = 4000;

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Public route — skip the Supabase round-trip entirely. ~99% of requests.
  if (!needsAuthRefresh(request.nextUrl.pathname)) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Bounded race — middleware never blocks past AUTH_REFRESH_TIMEOUT_MS.
  // We don't surface the timeout to the user; the server component layer
  // will handle missing sessions correctly on its own.
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`auth refresh timed out after ${AUTH_REFRESH_TIMEOUT_MS}ms`)),
          AUTH_REFRESH_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    // Log loudly so we see Supabase slowness in Vercel logs, but DON'T 500
    // the request — the page itself decides what to do with no session.
    console.error('[middleware] auth refresh failed', err);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
