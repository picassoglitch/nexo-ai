import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PW_RECOVERY_COOKIE, PW_RECOVERY_MAX_AGE } from '@/lib/auth/recovery';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/account';
  // A reset-password link routes through here. The session we're about to mint
  // is a recovery session — gate it so it can ONLY be used to set a new
  // password, never to roam the app. See @/lib/auth/recovery.
  const isRecovery = next.includes('reset-password');

  const oauthError = url.searchParams.get('error');
  const oauthErrorDescription = url.searchParams.get('error_description');
  if (oauthError) {
    const msg = oauthErrorDescription ?? oauthError;
    console.error('OAuth provider error:', msg);
    return NextResponse.redirect(`${url.origin}/sign-in?error=${encodeURIComponent(msg)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${url.origin}${next}`);
      res.cookies.set(PW_RECOVERY_COOKIE, isRecovery ? '1' : '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        // Recovery → gate on for 30 min. Any other sign-in (OAuth, etc.) →
        // clear a stale gate so it can't lock the user out.
        maxAge: isRecovery ? PW_RECOVERY_MAX_AGE : 0,
      });
      return res;
    }
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(
      `${url.origin}/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${url.origin}/sign-in?error=missing_code`);
}
