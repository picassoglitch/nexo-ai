'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export type Path = 'client' | 'partner' | 'earn';

export const PATH_META: Record<Path, { accent: string; glow: string; order: string[] }> = {
  client: {
    accent: '#3df5e0',
    glow: 'rgba(61,245,224,0.4)',
    order: ['proof', 'client-world', 'partner-world', 'earn-world'],
  },
  partner: {
    accent: '#7a5cff',
    glow: 'rgba(122,92,255,0.4)',
    order: ['partner-world', 'proof', 'client-world', 'earn-world'],
  },
  earn: {
    accent: '#c6f24e',
    glow: 'rgba(198,242,78,0.4)',
    order: ['earn-world', 'proof', 'client-world', 'partner-world'],
  },
};

const NEUTRAL_ACCENT = '#c6f24e';
const NEUTRAL_GLOW = 'rgba(198,242,78,0.4)';
const DEFAULT_ORDER = ['proof', 'client-world', 'partner-world', 'earn-world'];

function isPath(v: string | null): v is Path {
  return v === 'client' || v === 'partner' || v === 'earn';
}

interface PathContextValue {
  path: Path | null;
  setPath: (next: Path | null, opts?: { scroll?: boolean }) => void;
  sectionOrder: string[];
}

const PathContext = createContext<PathContextValue | null>(null);

export function PathProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Derive path from URL on every render — single source of truth.
  // Locale switches preserve ?view= via the nav, so the URL is the canonical state.
  const urlView = searchParams.get('view');
  const path: Path | null = isPath(urlView) ? urlView : null;

  useEffect(() => {
    const root = document.documentElement;
    const accent = path ? PATH_META[path].accent : NEUTRAL_ACCENT;
    const glow = path ? PATH_META[path].glow : NEUTRAL_GLOW;
    root.style.setProperty('--path', accent);
    root.style.setProperty('--path-glow', glow);
  }, [path]);

  const setPath = useCallback(
    (next: Path | null, opts?: { scroll?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set('view', next);
      else params.delete('view');
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });

      if (opts?.scroll && next) {
        const firstId = PATH_META[next].order[0];
        if (firstId) {
          setTimeout(() => {
            const el = document.getElementById(firstId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 120);
        }
      }
    },
    [router, searchParams],
  );

  const sectionOrder = path ? PATH_META[path].order : DEFAULT_ORDER;
  const value = useMemo(() => ({ path, setPath, sectionOrder }), [path, setPath, sectionOrder]);

  return <PathContext.Provider value={value}>{children}</PathContext.Provider>;
}

export function usePath() {
  const ctx = useContext(PathContext);
  if (!ctx) throw new Error('usePath must be used inside <PathProvider>');
  return ctx;
}
