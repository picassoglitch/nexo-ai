// Password-recovery gate.
//
// Clicking a reset link makes Supabase mint a FULL session before the user has
// set a new password — so without a gate the link doubles as a silent login
// into the app. We set this httpOnly cookie when a recovery session is
// established (see app/auth/callback) and the middleware blocks all protected
// routes while it's present, forcing the user to /reset-password. It clears
// only when the password is actually changed OR the user signs in normally
// with credentials they already know (see /api/auth/clear-recovery).
export const PW_RECOVERY_COOKIE = 'nexo_pw_recovery';

// Matches the reset-link validity window. If a recovery is abandoned, the gate
// auto-lifts after this so a stale cookie can't lock anyone out indefinitely.
export const PW_RECOVERY_MAX_AGE = 60 * 30; // 30 minutes
