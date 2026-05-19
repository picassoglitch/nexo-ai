// Engine usage reporting endpoint.
//
// POST /api/engines/{slug}/usage
//   Auth: Bearer engine admin token (e.g. NEXOCLIP_ADMIN_TOKEN).
//         The token identifies WHICH engine is reporting; the URL slug must
//         match the slug the token belongs to (defense-in-depth so a leaked
//         NexoStream token can't write usage on NexoClip's behalf).
//   Body: {
//     external_user_id: string,   // Nexo AI user id (matches profiles.id)
//     events: [
//       { kind: 'llm.tokens', amount: 1234, source_id: 'llm_call_xyz',
//         occurred_at?: '2026-...' }
//     ]
//   }
//   Returns: { ok: true, balance: { remaining, monthlyAllocation, bonus,
//             monthlyUsed, periodStart } }
//
// Engines call this AFTER every LLM call (or batched every N seconds). The
// returned balance lets the engine decide whether to keep spending or pause
// the user with "out of tokens".
//
// GET /api/engines/{slug}/usage/balance?external_user_id=<id>
//   Same auth. Returns the current balance without writing. Engines hit this
//   before kicking off expensive work to decide whether to bail.

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTokenBalance, recordUsageEvents } from '@/lib/usage/tokens';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Map engine slug → expected admin bearer env var. Keep this in sync with
// the bearer tokens each engine integration uses outbound. Adding a new
// engine = add a row here + the matching env var.
const ENGINE_BEARER_ENV: Record<string, string> = {
  nexoclip: 'NEXOCLIP_ADMIN_TOKEN',
  // nexostream: 'NEXOSTREAM_ADMIN_TOKEN',   // when it ships
};

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function checkEngineBearer(req: Request, slug: string): { ok: true } | { ok: false; status: number; error: string } {
  const envName = ENGINE_BEARER_ENV[slug];
  if (!envName) {
    return { ok: false, status: 404, error: `unknown engine: ${slug}` };
  }
  const expected = process.env[envName];
  if (!expected) {
    return { ok: false, status: 503, error: `${envName} not configured` };
  }
  const header = req.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'missing bearer token' };
  }
  const presented = header.slice('bearer '.length).trim();
  if (!constantTimeEqual(presented, expected)) {
    return { ok: false, status: 403, error: 'invalid bearer token' };
  }
  return { ok: true };
}

interface PostBody {
  external_user_id?: string;
  events?: Array<{
    kind?: string;
    amount?: number;
    source_id?: string;
    occurred_at?: string;
    /** Optional engine-supplied operation tag for /app/usage grouping. */
    operation?: string;
    /** Optional engine context bag (stream_id, clip_id, est_tokens, etc). */
    metadata?: Record<string, unknown>;
  }>;
}

const VALID_KINDS = new Set(['llm.tokens', 'storage.mb', 'publish.count']);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const auth = checkEngineBearer(req, slug);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const userId = body.external_user_id;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: 'external_user_id required' },
      { status: 400 },
    );
  }

  // Resolve userId → confirm it exists. The engine should never send an
  // unknown user, but if it does we return 404 so the engine knows to
  // re-provision rather than retry silently.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json(
      { error: 'unknown user_id' },
      { status: 404 },
    );
  }

  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) {
    // No events to record — just return the current balance. Useful as a
    // GET-equivalent for engines that want to check spend without writing.
    const balance = await getTokenBalance(userId);
    return NextResponse.json({ ok: true, inserted: 0, balance });
  }

  // Validate each event and build the recorder input.
  const normalized: Parameters<typeof recordUsageEvents>[0] = [];
  for (const e of events) {
    if (
      !e.kind ||
      !VALID_KINDS.has(e.kind) ||
      typeof e.amount !== 'number' ||
      e.amount < 0 ||
      !e.source_id
    ) {
      return NextResponse.json(
        { error: 'invalid event shape', event: e },
        { status: 400 },
      );
    }
    normalized.push({
      engineSlug: slug,
      userId,
      kind: e.kind as 'llm.tokens' | 'storage.mb' | 'publish.count',
      amount: e.amount,
      sourceId: e.source_id,
      occurredAt: e.occurred_at,
      operation: typeof e.operation === 'string' ? e.operation : undefined,
      metadata:
        e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata)
          ? (e.metadata as Record<string, unknown>)
          : undefined,
    });
  }

  const result = await recordUsageEvents(normalized);
  const balance = await getTokenBalance(userId);
  return NextResponse.json({ ok: true, ...result, balance });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;
  const auth = checkEngineBearer(req, slug);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get('external_user_id');
  if (!userId) {
    return NextResponse.json(
      { error: 'external_user_id query param required' },
      { status: 400 },
    );
  }
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: 'unknown user_id' }, { status: 404 });
  }
  const balance = await getTokenBalance(userId);
  return NextResponse.json({ ok: true, balance });
}
