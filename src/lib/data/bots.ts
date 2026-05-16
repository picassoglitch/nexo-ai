// Real Prisma-equivalent reads against Supabase Postgres for command-center bots.
// The UI imports from here; it never touches the Supabase client directly.

import { createClient } from '@/lib/supabase/server';
import {
  type Bot,
  type BotCategory,
  type BotEnv,
  type BotState,
  STATE_TO_CODE,
} from './types';

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

interface BotRow {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: BotCategory;
  type: string;
  env: BotEnv;
  region: string;
  node: string | null;
  description: string | null;
  featured: boolean;
  bot_health: Array<{
    state: BotState;
    health: number;
    latency_ms: number;
    revenue_cents: number;
  }> | null;
  bot_personas: Array<{
    persona: string | null;
    tone: string | null;
    goals: string | null;
    focus: string | null;
    learning_state: string | null;
    engagement_score: number;
  }> | null;
}

function rowToBot(row: BotRow, favoriteIds: Set<string>): Bot {
  const health = row.bot_health?.[0];
  const persona = row.bot_personas?.[0];
  const state: BotState = health?.state ?? 'OFFLINE';
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: row.icon ?? '◆',
    category: row.category,
    type: row.type,
    env: row.env,
    region: row.region,
    node: row.node ?? '—',
    description: row.description ?? '',
    featured: row.featured,
    state,
    stateCode: STATE_TO_CODE[state],
    health: health?.health ?? 0,
    latencyMs: health?.latency_ms ?? 0,
    revenueCents: health?.revenue_cents ?? 0,
    favorite: favoriteIds.has(row.id),
    persona: persona
      ? {
          persona: persona.persona ?? '',
          tone: persona.tone ?? '',
          goals: persona.goals ?? '',
          focus: persona.focus ?? '',
          learningState: persona.learning_state ?? '',
          engagementScore: persona.engagement_score,
        }
      : undefined,
  };
}

export async function listBots(): Promise<Bot[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Bots + their 1:1 health + 1:1 persona via foreign-table embed.
  const { data, error } = await supabase
    .from('bots')
    .select(
      'id, slug, name, icon, category, type, env, region, node, description, featured, bot_health(state, health, latency_ms, revenue_cents), bot_personas(persona, tone, goals, focus, learning_state, engagement_score)',
    )
    .eq('org_id', DEMO_ORG_ID)
    .order('category')
    .order('name');

  if (error) {
    // Friendly hint when the CP2 migration hasn't been run yet — the dashboard
    // just shows an empty state instead of throwing.
    const missingTable =
      error.code === '42P01' ||
      /could not find the table|relation .* does not exist|schema cache/i.test(error.message);
    if (missingTable) {
      console.warn(
        '[bots.listBots] tables not provisioned yet — run supabase/migrations/0002_command_center.sql in your Supabase SQL editor, then refresh.',
      );
    } else {
      console.error('[bots.listBots]', error.message);
    }
    return [];
  }

  const { data: favRows } = await supabase.from('favorites').select('bot_id').eq('user_id', user.id);
  const favIds = new Set((favRows ?? []).map((r) => r.bot_id as string));
  return (data as BotRow[]).map((r) => rowToBot(r, favIds));
}

export async function getBot(botId: string): Promise<Bot | null> {
  const all = await listBots();
  return all.find((b) => b.id === botId) ?? null;
}

