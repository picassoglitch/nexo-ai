'use client';

import { Link, usePathname } from '@/i18n/routing';
import { WS_TABS } from './nav-config';
import { useWorkspace } from '@/lib/workspace/store';

// Phone navigation. The workspace used to hide every destination behind a
// hamburger, so on mobile each move cost two taps and a drawer. The four
// destinations people actually cycle between now sit under the thumb; "Más"
// opens the full sidebar for the rest.
export function WorkspaceTabBar() {
  const pathname = usePathname();
  const openSidebar = useWorkspace((s) => s.setMobileSidebarOpen);

  function isActive(href: string): boolean {
    if (href === '/app') return pathname === '/app';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="ws-tabbar">
      {WS_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`ws-tab${isActive(tab.href) ? ' on' : ''}`}
        >
          <span className="ws-tab-ic" aria-hidden="true">
            {tab.icon}
          </span>
          {tab.tabLabel ?? tab.label}
        </Link>
      ))}
      <button type="button" className="ws-tab" onClick={() => openSidebar(true)}>
        <span className="ws-tab-ic" aria-hidden="true">
          ☰
        </span>
        Más
      </button>
    </nav>
  );
}
