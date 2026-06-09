// GET /auth/launch/<slug>
//
// Cross-app SSO launcher. Lets one engine link to another while keeping the
// session: the user is already authenticated at Nexo-AI (cookie on this
// domain), so this route mints the engine's signed SSO token and 302s
// straight into its dashboard — no landing/login bounce.
//
// Used by NexoClip's "Transmitir con NexoOBS" button (→ /auth/launch/nexoobs)
// and NexoOBS's "Get Clips" button (→ /auth/launch/nexoclip).
//
// Gated to VIP: the cross-engine streaming↔clips feature is a
// full-access perk. Lower tiers get redirected to the engine's upgrade page.
//
// Under /auth/* so it's excluded from the i18n middleware matcher (no locale
// prefix rewriting on a redirect-only endpoint).

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { effectiveTier } from '@/lib/billing/tiers';
import { provisionEngineAccess } from '@/lib/engines/subscriptions';
import { getEngineLaunchUrl } from '@/lib/engines/launch-actions';

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await ctx.params;
  const origin = request.nextUrl.origin;

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(
      new URL(`/sign-in?next=${encodeURIComponent(`/auth/launch/${slug}`)}`, origin),
    );
  }

  // Full-access gate.
  const tier = effectiveTier(session.role, session.tier);
  if (tier !== 'VIP') {
    return NextResponse.redirect(new URL(`/app/engines/${slug}`, origin));
  }

  const admin = createAdminClient();
  const { data: engine } = await admin
    .from('engines')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (!engine) {
    return NextResponse.redirect(new URL('/app/engines', origin));
  }
  const engineId = engine.id as string;

  // Ensure the user is provisioned on the target engine (idempotent) so the
  // launch has an external_user_id to sign into the SSO token.
  try {
    await provisionEngineAccess(session.user.id, engineId, 'all_access_seed');
  } catch {
    // Non-fatal — getEngineLaunchUrl will report if access is still missing.
  }

  const result = await getEngineLaunchUrl(engineId);
  if (result.ok && result.url) {
    return NextResponse.redirect(result.url);
  }
  // Couldn't build the launch URL (engine not configured / provisioning
  // failed) — drop the user on the engine page where the error surfaces.
  return NextResponse.redirect(new URL(`/app/engines/${slug}`, origin));
}
