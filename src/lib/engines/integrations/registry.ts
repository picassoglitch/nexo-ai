// Engine integration registry — lookup by slug.
// Add a new engine = import its integration module + register here.

import 'server-only';
import { nexoclipIntegration } from './nexoclip';
import type { EngineIntegration } from './types';

const REGISTRY: Record<string, EngineIntegration> = {
  [nexoclipIntegration.slug]: nexoclipIntegration,
  // NexoStreamManager goes here when its integration file lands:
  //   [nexostreamIntegration.slug]: nexostreamIntegration,
};

export function getIntegration(slug: string): EngineIntegration | null {
  return REGISTRY[slug] ?? null;
}
