'use client';

import { useEffect } from 'react';
import { useDashboard } from '@/lib/dashboard/store';
import { Sidebar } from './sidebar';
import { ActivityRail } from './activity-rail';
import { MetricStrip } from './metric-strip';
import { OperatorSurface, Toolbar } from './operator-rows';
import { CommandPalette } from './command-palette';
import { DetailDrawer } from './detail-drawer';
import { Toast } from './toast';
import type { Bot } from '@/lib/data/types';

interface Props {
  initialBots: Bot[];
  userInitial: string;
  userName: string;
  userRole: string;
}

export function DashboardClient({ initialBots, userInitial, userName, userRole }: Props) {
  const setBots = useDashboard((s) => s.setBots);
  const openPalette = useDashboard((s) => s.openPalette);
  const mobileSidebarOpen = useDashboard((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useDashboard((s) => s.setMobileSidebarOpen);
  const showToast = useDashboard((s) => s.showToast);

  // Seed Zustand from server-fetched bots once on mount. Deliberate sync from
  // server-prop into client store — the rule's "don't setState in effect" guidance
  // doesn't apply to one-time hydration from props.
  useEffect(() => {
    setBots(initialBots);
  }, [initialBots, setBots]);

  return (
    <div className="cc-shell">
      {mobileSidebarOpen && (
        <div className="cc-sbscrim show" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <Sidebar
        userInitial={userInitial}
        userName={userName}
        userRole={userRole}
        mobileOpen={mobileSidebarOpen}
      />

      <main className="cc-main">
        <MetricStrip totalBots={initialBots.length} />

        <div className="cc-ph">
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <button
              type="button"
              className="cc-mtoggle"
              aria-label="Menu"
              onClick={() => setMobileSidebarOpen(true)}
            >
              ☰
            </button>
            <div>
              <h1 className="cc-pg-title">Operaciones</h1>
              <div className="cc-pg-sub">
                Todos los sistemas, agentes y trabajos de IA — estado en vivo.
              </div>
            </div>
          </div>
          <div className="cc-tools">
            <button type="button" className="cc-cmdk" onClick={openPalette}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ width: 14, height: 14 }}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <span>Buscar o ejecutar…</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              type="button"
              className="cc-ibtn"
              title="Notificaciones"
              onClick={() => showToast('Sin notificaciones nuevas.')}
            >
              🔔
            </button>
          </div>
        </div>

        <Toolbar />

        <div className="cc-scroll">
          <OperatorSurface />
        </div>
      </main>

      <ActivityRail />

      <button
        type="button"
        className="cc-mrail"
        title="Actividad"
        onClick={() => showToast('Actividad de IA — abre en pantalla completa en build phase')}
      >
        ⚡
      </button>

      <CommandPalette />
      <DetailDrawer />
      <Toast />
    </div>
  );
}
