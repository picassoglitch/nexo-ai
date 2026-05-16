'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDashboard } from '@/lib/dashboard/store';
import { ENV_LABEL } from '@/lib/data/types';

interface Cmd {
  g: string;
  ic: string;
  n: string;
  s: string;
  k?: string;
  botId?: string;
}

const STATIC_CMDS: Cmd[] = [
  { g: 'Acciones', ic: '▶', n: 'Iniciar stream', s: 'AVA Streamer · Kick', k: 'S' },
  { g: 'Acciones', ic: '✂', n: 'Crear clip', s: 'NexoClip · último VOD' },
  { g: 'Acciones', ic: '💬', n: 'Generar subtítulos', s: 'SubtitleForge' },
  { g: 'Acciones', ic: '↗', n: 'Publicar a TikTok', s: 'Publishing' },
  { g: 'Acciones', ic: '⟳', n: 'Reiniciar worker', s: 'Selecciona un sistema' },
  { g: 'Acciones', ic: '👥', n: 'Invitar miembro', s: 'Team & Roles' },
  { g: 'Navegar', ic: '◑', n: 'Abrir Analytics', s: 'Métricas e ingresos' },
  { g: 'Navegar', ic: '$', n: 'Abrir Revenue', s: 'MRR por sistema' },
  { g: 'Navegar', ic: '▤', n: 'Abrir Infra', s: 'Workers · GPU · costos' },
];

export function CommandPalette() {
  const open = useDashboard((s) => s.paletteOpen);
  const toggle = useDashboard((s) => s.togglePalette);
  const close = useDashboard((s) => s.closePalette);
  const bots = useDashboard((s) => s.bots);
  const openDrawer = useDashboard((s) => s.openDrawer);
  const showToast = useDashboard((s) => s.showToast);

  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allCmds = useMemo<Cmd[]>(() => {
    const botCmds: Cmd[] = bots.map((b) => ({
      g: 'Sistemas',
      ic: b.icon,
      n: `Abrir ${b.name}`,
      s: `${b.type} · ${ENV_LABEL[b.env]}`,
      botId: b.id,
    }));
    return [...STATIC_CMDS, ...botCmds];
  }, [bots]);

  const items = useMemo(() => {
    if (!q) return allCmds.slice(0, 40);
    const lc = q.toLowerCase();
    return allCmds.filter((c) => (c.n + ' ' + c.s).toLowerCase().includes(lc)).slice(0, 40);
  }, [allCmds, q]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((s) => Math.min(s + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const c = items[sel];
        if (c) runCmd(c);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, sel, toggle, close]);

  useEffect(() => {
    if (!open) return;
    // Deliberate: reset palette state when it opens. setState-in-effect is the
    // right pattern here — we're syncing to a remote toggle (open prop).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ('');
    setSel(0);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('.cc-cmdi.sel');
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel, open]);

  function runCmd(c: Cmd) {
    close();
    if (c.botId) {
      openDrawer(c.botId);
      return;
    }
    showToast(`<b>${c.n}</b> — ejecutado`);
  }

  if (!open) return null;

  let lastG: string | null = null;

  return (
    <div className="cc-cmdov" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="cc-cmdp">
        <div className="cc-ci">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder="Escribe un comando o busca un sistema…"
            autoComplete="off"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="cc-cmdl" ref={listRef}>
          {items.map((c, i) => {
            const showGroup = c.g !== lastG;
            lastG = c.g;
            return (
              <div key={`${c.g}-${i}`}>
                {showGroup && <div className="cc-cmdg">{c.g}</div>}
                <button
                  type="button"
                  className={`cc-cmdi${i === sel ? ' sel' : ''}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => runCmd(c)}
                >
                  <span className="cc-cic">{c.ic}</span>
                  <span className="cc-ct">
                    <span className="cc-cn">{c.n}</span>
                    <span className="cc-cs">{c.s}</span>
                  </span>
                  {c.k && <span className="cc-ck">⌘{c.k}</span>}
                </button>
              </div>
            );
          })}
          {!items.length && <div className="cc-empty-feed">Sin resultados.</div>}
        </div>
        <div className="cc-cf">
          <span>
            <kbd>↑↓</kbd> navegar
          </span>
          <span>
            <kbd>↵</kbd> ejecutar
          </span>
          <span>
            <kbd>esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
