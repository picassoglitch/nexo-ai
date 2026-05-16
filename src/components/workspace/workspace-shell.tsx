'use client';

import { usePathname } from '@/i18n/routing';
import { useWorkspace } from '@/lib/workspace/store';
import { WorkspaceSidebar } from './workspace-sidebar';
import { PAGE_META } from '@/components/dashboard/nav-data';

interface Props {
  userInitial: string;
  userName: string;
  tierLabel: string;
  children: React.ReactNode;
}

export function WorkspaceShell({ userInitial, userName, tierLabel, children }: Props) {
  const pathname = usePathname();
  const mobileSidebarOpen = useWorkspace((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useWorkspace((s) => s.setMobileSidebarOpen);
  const toastHtml = useWorkspace((s) => s.toastHtml);

  const meta = PAGE_META[pathname] ?? { title: 'Tu espacio', sub: '' };

  return (
    <div className="cc-shell" style={{ gridTemplateColumns: 'var(--cc-sb) 1fr' }}>
      {mobileSidebarOpen && (
        <div className="cc-sbscrim show" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <WorkspaceSidebar userInitial={userInitial} userName={userName} tierLabel={tierLabel} />

      <main className="cc-main">
        <div className="cc-ph" style={{ paddingTop: 24 }}>
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
              <h1 className="cc-pg-title">{meta.title}</h1>
              <div className="cc-pg-sub">{meta.sub}</div>
            </div>
          </div>
        </div>
        {children}
      </main>

      {toastHtml && (
        <div className="cc-toast show">
          <span className="cc-td" />
          <span dangerouslySetInnerHTML={{ __html: toastHtml }} />
        </div>
      )}
    </div>
  );
}
