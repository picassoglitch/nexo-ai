'use client';

import type { Route } from 'next';
import { Link, usePathname } from '@/i18n/routing';
import { FusionMark } from '@/components/dashboard/fusion-mark';
import { SidebarSignOut } from '@/components/dashboard/sidebar-sign-out';
import { WS_NAV } from './nav-config';
import { useWorkspace } from '@/lib/workspace/store';

interface Props {
  userInitial: string;
  userName: string;
  tierLabel: string;
  isAdmin: boolean;
  /** Unread admin messages. 0 hides the badge; ≥100 collapses to "99+" so the
   *  badge width stays predictable. */
  unreadMessages?: number;
}

function badgeCount(n: number): string {
  return n >= 100 ? '99+' : String(n);
}

export function WorkspaceSidebar({
  userInitial,
  userName,
  tierLabel,
  isAdmin,
  unreadMessages = 0,
}: Props) {
  const pathname = usePathname();
  const open = useWorkspace((s) => s.mobileSidebarOpen);
  const close = () => useWorkspace.getState().setMobileSidebarOpen(false);

  function isActive(href: string): boolean {
    if (href === '/app') return pathname === '/app';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className={`ws-sb${open ? ' open' : ''}`}>
      <div className="ws-sb-top">
        <Link href={'/app' as Route} className="ws-sb-brand" onClick={close}>
          <FusionMark size={24} />
          Nexo<span className="ws-accent">AI</span>
        </Link>
        <span className="ws-tier">{tierLabel}</span>
      </div>

      <nav className="ws-sb-scroll" data-tour="nav">
        {WS_NAV.map((group) => (
          <div key={group.id} className="ws-sb-grp">
            <div className="ws-gl">{group.label}</div>
            {group.items.map((item) => {
              const showUnread = item.id === 'messages' && unreadMessages > 0;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-tour={`nav-${item.id}`}
                  className={`ws-nav-item${isActive(item.href) ? ' on' : ''}`}
                  onClick={close}
                >
                  <span className="ws-nav-ic" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="ws-nav-label">{item.label}</span>
                  {showUnread && <span className="ws-ct alert">{badgeCount(unreadMessages)}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Admins can swap into the operator command center. */}
        {isAdmin && (
          <div className="ws-sb-grp">
            <div className="ws-gl">Vista</div>
            <Link href={'/dashboard' as Route} className="ws-nav-item" onClick={close}>
              <span className="ws-nav-ic" aria-hidden="true">
                ⬡
              </span>
              <span className="ws-nav-label">Command center</span>
              <span className="ws-ct">→</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="ws-sb-foot">
        <div className="ws-ava">{userInitial}</div>
        <div className="ws-u">
          <div className="ws-u-n">{userName}</div>
          <div className="ws-u-r">Plan {tierLabel}</div>
        </div>
        <Link
          href={'/app/settings' as Route}
          className="ws-icon-btn"
          title="Tu cuenta"
          onClick={close}
        >
          ⚙
        </Link>
        <SidebarSignOut className="ws-icon-btn danger" onBeforeNav={close} />
      </div>
    </aside>
  );
}
