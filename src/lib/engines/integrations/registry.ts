// Engine integration registry — lookup by slug.
// Add a new engine = import its integration module + register here.

import 'server-only';
import { chalybclipIntegration } from './chalybclip';
import { chalybcryptoIntegration } from './chalybcrypto';
import { chalybobsIntegration } from './chalybobs';
import type { EngineIntegration } from './types';

const REGISTRY: Record<string, EngineIntegration> = {
  [chalybclipIntegration.slug]: chalybclipIntegration,
  [chalybcryptoIntegration.slug]: chalybcryptoIntegration,
  [chalybobsIntegration.slug]: chalybobsIntegration,
  // ChalybStreamManager goes here when its integration file lands:
  //   [chalybstreamIntegration.slug]: chalybstreamIntegration,
};

export function getIntegration(slug: string): EngineIntegration | null {
  return REGISTRY[slug] ?? null;
}
