'use client';

import { WorkspaceSidebar } from './workspace-sidebar';
import { WorkspaceTopBar } from './workspace-topbar';
import { WorkspaceTabBar } from './workspace-tabbar';
import { WorkspaceTour } from './workspace-tour';
import { useWorkspace } from '@/lib/workspace/store';

interface Props {
  userInitial: string;
  userName: string;
  tierLabel: string;
  isAdmin: boolean;
  unreadMessages?: number;
  tokensLabel: string;
  tokensLow: boolean;
  children: React.ReactNode;
}

export function WorkspaceShell({
  userInitial,
  userName,
  tierLabel,
  isAdmin,
  unreadMessages = 0,
  tokensLabel,
  tokensLow,
  children,
}: Props) {
  const mobileSidebarOpen = useWorkspace((s) => s.mobileSidebarOpen);
  const setMobileSidebarOpen = useWorkspace((s) => s.setMobileSidebarOpen);
  const toastHtml = useWorkspace((s) => s.toastHtml);

  return (
    <div className="ws">
      <div className="ws-shell">
        {mobileSidebarOpen && (
          <div className="ws-scrim" onClick={() => setMobileSidebarOpen(false)} />
        )}

        <WorkspaceSidebar
          userInitial={userInitial}
          userName={userName}
          tierLabel={tierLabel}
          isAdmin={isAdmin}
          unreadMessages={unreadMessages}
        />

        <div className="ws-main">
          <WorkspaceTopBar tokensLabel={tokensLabel} tokensLow={tokensLow} />
          <div className="ws-page">{children}</div>
        </div>
      </div>

      <WorkspaceTabBar />

      {toastHtml && (
        <div className="ws-toast">
          <span className="ws-toast-dot" />
          <span dangerouslySetInnerHTML={{ __html: toastHtml }} />
        </div>
      )}

      {/* First-run onboarding tour (once per browser, /app only). */}
      <WorkspaceTour />
    </div>
  );
}
