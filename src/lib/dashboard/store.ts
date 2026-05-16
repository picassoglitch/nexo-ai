'use client';

import { create } from 'zustand';
import type { Bot, BotCategory } from '@/lib/data/types';

type DrawerTab = 'metrics' | 'logs' | 'console' | 'ai' | 'autos' | 'api';

interface DashboardState {
  // Drawer
  drawerBotId: string | null;
  drawerTab: DrawerTab;
  openDrawer: (botId: string) => void;
  closeDrawer: () => void;
  setDrawerTab: (tab: DrawerTab) => void;

  // Command palette
  paletteOpen: boolean;
  togglePalette: () => void;
  openPalette: () => void;
  closePalette: () => void;

  // Filters
  query: string;
  activeCats: Set<BotCategory>;
  viewMode: 'rows' | 'fav';
  setQuery: (q: string) => void;
  toggleCat: (c: BotCategory) => void;
  setViewMode: (m: 'rows' | 'fav') => void;

  // Local bot overrides (favorite toggle + health drift from SSE)
  bots: Bot[];
  setBots: (bots: Bot[]) => void;
  toggleFavorite: (botId: string) => void;
  applyHealthDrift: (drift: Array<{ botId: string; health: number }>) => void;

  // Mobile sidebar
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;

  // Toast
  toastHtml: string | null;
  showToast: (html: string) => void;
  clearToast: () => void;
}

export const useDashboard = create<DashboardState>((set) => ({
  drawerBotId: null,
  drawerTab: 'metrics',
  openDrawer: (botId) => set({ drawerBotId: botId, drawerTab: 'metrics' }),
  closeDrawer: () => set({ drawerBotId: null }),
  setDrawerTab: (tab) => set({ drawerTab: tab }),

  paletteOpen: false,
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
  openPalette: () => set({ paletteOpen: true }),
  closePalette: () => set({ paletteOpen: false }),

  query: '',
  activeCats: new Set(),
  viewMode: 'rows',
  setQuery: (q) => set({ query: q }),
  toggleCat: (c) =>
    set((s) => {
      const next = new Set(s.activeCats);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return { activeCats: next };
    }),
  setViewMode: (m) => set({ viewMode: m }),

  bots: [],
  setBots: (bots) => set({ bots }),
  toggleFavorite: (botId) =>
    set((s) => ({
      bots: s.bots.map((b) => (b.id === botId ? { ...b, favorite: !b.favorite } : b)),
    })),
  applyHealthDrift: (drift) =>
    set((s) => {
      const m = new Map(drift.map((d) => [d.botId, d.health]));
      return { bots: s.bots.map((b) => (m.has(b.id) ? { ...b, health: m.get(b.id)! } : b)) };
    }),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

  toastHtml: null,
  showToast: (html) => {
    set({ toastHtml: html });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => set({ toastHtml: null }), 2600);
    }
  },
  clearToast: () => set({ toastHtml: null }),
}));
