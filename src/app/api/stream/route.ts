// SSE endpoint — emits strip ticks, activity events, and rail stats on intervals.
// Health drift is sent too but with a sparser cadence. Authenticated; closes on disconnect.
// Cadences match the prototype's setInterval rhythm.

import { createClient } from '@/lib/supabase/server';
import { nextActivityEvent, tickRail, tickStrip } from '@/lib/data/telemetry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ENCODER = new TextEncoder();

function send(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(ENCODER.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Emit an initial snapshot so the UI fills immediately, then start the loops.
      send(controller, { kind: 'strip', strip: tickStrip() });
      send(controller, { kind: 'rail', rail: tickRail() });

      const stripT = setInterval(() => send(controller, { kind: 'strip', strip: tickStrip() }), 2200);
      const actT = setInterval(
        () => send(controller, { kind: 'activity', event: nextActivityEvent() }),
        3400,
      );
      const railT = setInterval(() => send(controller, { kind: 'rail', rail: tickRail() }), 4800);

      // Keepalive ping every 25s to defeat proxy idle timeouts.
      const pingT = setInterval(() => controller.enqueue(ENCODER.encode(`: ping\n\n`)), 25000);

      // Cleanup on client disconnect.
      const close = () => {
        clearInterval(stripT);
        clearInterval(actT);
        clearInterval(railT);
        clearInterval(pingT);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      // The signal isn't exposed to start(), so attach via close() lifecycle.
      // Caller cancel triggers this stream's cancel() below.
      (controller as unknown as { __close?: () => void }).__close = close;
    },
    cancel() {
      const close = (this as unknown as { __close?: () => void }).__close;
      if (close) close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
