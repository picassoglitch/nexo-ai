// SWAP POINT: replace generators with real worker telemetry (WS/SSE/Supabase Realtime).
// UI contracts above (Engine, ActivityEvent, StripValue, StreamTick from ./types) must not change.

import { type ActivityEvent, type EngineStateCode, type StripValue } from './types';

export const MOCK = true;

const STRIP_BASE: Record<string, number> = {
  active: 48,
  aicalls: 312,
  rev: 6420,
  streams: 3,
  queue: 41,
  gpu: 67,
};

// Persistent per-process state so the SSE stream returns a smooth random walk.
const stripState: Record<string, { cur: number; hist: number[] }> = Object.fromEntries(
  Object.entries(STRIP_BASE).map(([id, base]) => [
    id,
    {
      cur: base,
      hist: Array.from({ length: 14 }, () => base * (0.85 + Math.random() * 0.3)),
    },
  ]),
);

export function tickStrip(): StripValue[] {
  return (Object.keys(STRIP_BASE) as Array<keyof typeof STRIP_BASE>).map((id) => {
    const base = STRIP_BASE[id]!;
    const s = stripState[id]!;
    const drift = (Math.random() - 0.45) * base * 0.04;
    s.cur = Math.max(0, s.cur + drift);
    s.hist.push(s.cur);
    s.hist.shift();
    return { id: id as StripValue['id'], value: Math.round(s.cur), hist: s.hist.slice() };
  });
}

// Activity feed seeds — only references the active engines (NexoClip,
// NexoStreamManager). Coming-soon engines don't emit events. Update this
// list when new engines go live.
const ACTS: Array<[EngineStateCode, string, string, string]> = [
  ['p', 'Renderizando short', 'NexoClip', 'batch 12/40'],
  ['g', 'Publicando a TikTok', 'NexoClip', 'clip #4187'],
  ['c', 'Generando variantes', 'NexoClip', '3 cortes'],
  ['g', 'Stream en vivo', 'NexoStreamManager', '312 viewers'],
  ['c', 'Analizando stream', 'NexoStreamManager', 'retención +14%'],
  ['g', 'Routing a Kick + Twitch', 'NexoStreamManager', '2 destinos'],
  ['p', 'Comprimiendo VOD', 'NexoClip', '3.2GB → 840MB'],
  ['a', 'Cola con backpressure', 'NexoClip', '41% carga'],
];

let eventSeq = 0;
export function nextActivityEvent(): ActivityEvent {
  const a = ACTS[Math.floor(Math.random() * ACTS.length)]!;
  eventSeq += 1;
  return {
    id: `e${Date.now()}-${eventSeq}`,
    kind: a[0],
    title: a[1],
    engine: a[2],
    meta: a[3],
    time: new Date().toTimeString().slice(0, 5),
  };
}

export function tickRail() {
  return {
    jobsPerHour: 140 + Math.floor(Math.random() * 40),
    queue: 5 + Math.floor(Math.random() * 6),
    tokensToday: (1.2 + Math.random() * 0.4).toFixed(1) + 'M',
    revenueToday: 6000 + Math.floor(Math.random() * 900),
  };
}

/**
 * Health drift — small random walk for non-offline/error engines.
 * Returns an array of {engineId, health} for the SSE client to merge into local state.
 * NOT persisted to Supabase (rev: keep DB stable, drift is purely visual).
 */
export function driftHealth(
  current: Array<{ id: string; health: number; stateCode: EngineStateCode }>,
) {
  return current
    .filter((e) => e.stateCode !== 'o' && e.stateCode !== 'r')
    .map((e) => ({
      engineId: e.id,
      health: Math.max(20, Math.min(99, Math.round(e.health + (Math.random() - 0.5) * 4))),
    }));
}
