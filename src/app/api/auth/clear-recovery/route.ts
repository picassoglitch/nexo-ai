import { NextResponse } from 'next/server';
import { PW_RECOVERY_COOKIE } from '@/lib/auth/recovery';

// Lifts the password-recovery gate. Called after the user either sets a new
// password or signs in normally with credentials they already know — both
// prove they're entitled to full app access, so the recovery restriction no
// longer applies. Excluded from middleware via the `api` matcher exclusion.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PW_RECOVERY_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
