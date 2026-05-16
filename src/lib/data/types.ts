// Shared types for the command center data layer.
// UI components depend on these — never on Supabase row shapes directly.

export type BotState = 'HEALTHY' | 'TRAINING' | 'RENDERING' | 'DELAYED' | 'ERROR' | 'OFFLINE';
export type BotStateCode = 'g' | 'c' | 'p' | 'a' | 'r' | 'o';
export type BotCategory = 'TRADING' | 'STREAMING' | 'CONTENT' | 'AGENTS' | 'RESEARCH' | 'INTERNAL';
export type BotEnv = 'PRODUCTION' | 'STAGING' | 'LOCAL' | 'GPU_NODE';

export const STATE_TO_CODE: Record<BotState, BotStateCode> = {
  HEALTHY: 'g',
  TRAINING: 'c',
  RENDERING: 'p',
  DELAYED: 'a',
  ERROR: 'r',
  OFFLINE: 'o',
};

export const STATE_LABEL: Record<BotStateCode, string> = {
  g: 'Healthy',
  c: 'Training',
  p: 'Rendering',
  a: 'Delayed',
  r: 'Error',
  o: 'Offline',
};

export const ENV_LABEL: Record<BotEnv, string> = {
  PRODUCTION: 'Production',
  STAGING: 'Staging',
  LOCAL: 'Local',
  GPU_NODE: 'GPU node',
};

export const CATS: { id: BotCategory; label: string; slug: string }[] = [
  { id: 'TRADING', label: 'Trading', slug: 'trading' },
  { id: 'STREAMING', label: 'Streaming', slug: 'streaming' },
  { id: 'CONTENT', label: 'Content AI', slug: 'content' },
  { id: 'AGENTS', label: 'AI Agents', slug: 'agents' },
  { id: 'RESEARCH', label: 'Research', slug: 'research' },
  { id: 'INTERNAL', label: 'Internal', slug: 'internal' },
];

export interface Bot {
  id: string;
  slug: string;
  name: string;
  icon: string;
  category: BotCategory;
  type: string;
  env: BotEnv;
  region: string;
  node: string;
  description: string;
  featured: boolean;
  state: BotState;
  stateCode: BotStateCode;
  health: number;
  latencyMs: number;
  revenueCents: number;
  favorite: boolean;
  persona?: BotPersona;
}

export interface BotPersona {
  persona: string;
  tone: string;
  goals: string;
  focus: string;
  learningState: string;
  engagementScore: number;
}

export interface ActivityEvent {
  id: string;
  kind: BotStateCode;
  title: string;
  bot: string;
  meta: string;
  time: string; // HH:MM
}

export type StripMetricId = 'active' | 'aicalls' | 'rev' | 'streams' | 'queue' | 'gpu';

export interface StripValue {
  id: StripMetricId;
  value: number;
  hist: number[]; // last 14 points for sparkline
}

export interface StreamTick {
  kind: 'strip' | 'activity' | 'health' | 'rail';
  strip?: StripValue[];
  event?: ActivityEvent;
  health?: Array<{ botId: string; health: number }>;
  rail?: {
    jobsPerHour: number;
    queue: number;
    tokensToday: string;
    revenueToday: number;
  };
}
