import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { PW_RECOVERY_COOKIE } from '@/lib/auth/recovery';

// Ends a password-recovery session and lifts the gate, then sends the user to
// sign in. Used by the reset page's "Cancel" link and by the post-reset
// hand-off. Everything happens server-side in a single redirect response — the
// auth-cookie clear (signOut) and the recovery-cookie clear land together,
// before the browser makes its next request. Doing this client-side (signOut +
// router.push) raced the middleware gate: the cookies weren't fully gone when
// the next protected-route navigation fired, so the user got bounced straight
// back to /reset-password. Under /auth/* so the middleware matcher skips it.
export async function GET(request: NextRequest) {
  const reset = request.nextUrl.searchParams.get('reset') === '1';
  const locale = request.nextUrl.searchParams.get('l');
  const prefix = locale && locale !== 'en' ? `/${locale}` : '';
  const dest = `${prefix}/sign-in${reset ? '?reset=success' : ''}`;
  const res = NextResponse.redirect(new URL(dest, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items) {
          items.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.signOut();

  res.cookies.set(PW_RECOVERY_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
