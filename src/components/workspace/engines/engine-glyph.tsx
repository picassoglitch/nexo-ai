'use client';

import {
  Scissors,
  CandlestickChart,
  Video,
  Radio,
  Bot,
  Target,
  Home,
  TrendingUp,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

// Engine glyphs as crisp vector icons (lucide) instead of emoji — emoji render
// inconsistently across OS/fonts (the old ✂ / 📊 / 🎥 showed as tofu boxes).
// Mapped by slug, with a neutral fallback for any engine we haven't styled yet.
// Color comes from the parent via `currentColor`, so the card tints per state.

const BY_SLUG: Record<string, LucideIcon> = {
  nexoclip: Scissors,
  nexocrypto: CandlestickChart,
  nexotrade: TrendingUp,
  nexoobs: Video,
  nexostream: Radio,
  nexobot: Bot,
  nexopicks: Target,
  nexorealtor: Home,
};

export function EngineGlyph({
  slug,
  size = 22,
  className,
}: {
  slug: string;
  size?: number;
  className?: string;
}) {
  const Icon = BY_SLUG[slug] ?? Boxes;
  return <Icon size={size} strokeWidth={1.75} className={className} aria-hidden />;
}
