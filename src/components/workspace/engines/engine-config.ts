// Shared types + presentation config for the "Mis engines" hub.
//
// The DB (lib/data/engines.ts) owns the source of truth for each engine's
// identity, status, tier gate, and ownership. It does NOT carry marketing copy
// (value-prop line, feature bullets) — that lives here, keyed by slug, with a
// category-based fallback so a newly-seeded engine still renders cleanly.
//
// This module is framework-agnostic (no 'use client'): the server page builds
// EngineVM[] and the client explorer renders them, both importing from here.

import type { EngineCategory } from '@/lib/data/types';

/** Coarse live/lock/lifecycle state — drives the status badge + filter bucket.
 *  Exactly one per engine. */
export type EngineLiveState =
  | 'live' // running live for this user (meets tier, selected / all-access)
  | 'trial' // live via the NexoClip trial/grace window (FREE user)
  | 'simulation' // active + available, but running in simulation (not live)
  | 'locked' // active but gated behind a higher plan
  | 'coming_soon'; // not launched yet

/** The filter tabs above the grid. `all` always matches. */
export type EngineFilterKey = 'all' | 'live' | 'simulation' | 'coming_soon' | 'locked';

export const ENGINE_FILTERS: { key: EngineFilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'live', label: 'En vivo' },
  { key: 'simulation', label: 'Simulación' },
  { key: 'coming_soon', label: 'Próximamente' },
  { key: 'locked', label: 'Requiere Pro' },
];

/** Which filter buckets an engine belongs to (besides 'all'). */
export function filterKeysFor(state: EngineLiveState): EngineFilterKey[] {
  switch (state) {
    case 'live':
    case 'trial':
      return ['all', 'live'];
    case 'simulation':
      return ['all', 'simulation'];
    case 'locked':
      return ['all', 'locked'];
    case 'coming_soon':
      return ['all', 'coming_soon'];
  }
}

/** Serializable view-model the server hands to the client explorer. No
 *  functions, no Date — safe to cross the RSC boundary. */
export interface EngineVM {
  id: string;
  slug: string;
  name: string;
  icon: string;
  type: string;
  categoryLabel: string;
  state: EngineLiveState;
  filterKeys: EngineFilterKey[];
  /** Marketing one-liner + up to 3 short bullets. */
  tagline: string;
  bullets: string[];
  /** Tier gate, pretty label ('Pro' | 'VIP' | 'Partner') or null for FREE. */
  requiresPlanLabel: string | null;
  meetsTier: boolean;
  /** Owner attribution. */
  isPlatformOwned: boolean;
  isOwnedByMe: boolean;
  ownerLabel: string;
  /** Footer meta. */
  envLabel: string;
  region: string;
  /** True only for the hero/featured treatment (NexoClip when usable now). */
  featured: boolean;
  /** PRO users can pick their single live engine from active+eligible cards. */
  canSelectLive: boolean;
  isSelectedLive: boolean;
}

interface Marketing {
  tagline: string;
  bullets: string[];
}

// Slug-specific copy. Keep bullets ≤3 and short — the card truncates hard.
const BY_SLUG: Record<string, Marketing> = {
  nexoclip: {
    tagline: 'Convierte tus streams en clips virales, en automático.',
    bullets: [
      'Detecta los mejores momentos con IA',
      'Render vertical 9:16 listo para publicar',
      'Exporta a TikTok, Reels y Shorts',
    ],
  },
  nexocrypto: {
    tagline: 'Señales y automatización de trading cripto 24/7.',
    bullets: ['Estrategias backtesteadas', 'Alertas en tiempo real', 'Ejecución sin emociones'],
  },
  nexoobs: {
    tagline: 'Controla tu transmisión en vivo desde un solo panel.',
    bullets: ['Escenas y overlays dinámicos', 'Automatización del stream', 'Conecta con NexoClip'],
  },
};

// Category fallback when a slug has no bespoke copy yet.
const BY_CATEGORY: Record<EngineCategory, string> = {
  STREAMING: 'Automatiza tu flujo de streaming en vivo.',
  CONTENT: 'Genera contenido a escala con IA.',
  TRADING: 'Opera con señales y automatización de IA.',
  AGENTS: 'Agentes de IA que ejecutan tareas por ti.',
  RESEARCH: 'Investigación automatizada con IA.',
  INTERNAL: 'Herramienta interna de la plataforma Nexo.',
};

const GENERIC_BULLETS = [
  'Ejecución en vivo impulsada por IA',
  'Panel y métricas en tiempo real',
  'Integrado con tu cuenta Nexo',
];

/** Resolve marketing copy for an engine, preferring slug-specific over
 *  category fallback. Always returns a tagline + ≤3 bullets. */
export function marketingFor(slug: string, category: EngineCategory, description: string): Marketing {
  const bySlug = BY_SLUG[slug];
  if (bySlug) return { tagline: bySlug.tagline, bullets: bySlug.bullets.slice(0, 3) };
  return {
    tagline: BY_CATEGORY[category] ?? description.slice(0, 80),
    bullets: GENERIC_BULLETS,
  };
}
