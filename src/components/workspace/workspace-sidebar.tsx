'use client';

import type { Route } from 'next';
import { Link, usePathname } from '@/i18n/routing';
import { FusionMark } from '@/components/dashboard/fusion-mark';
import { SUBSCRIBER_NAV } from '@/components/dashboard/nav-data';
import { useWorkspace } from '@/lib/workspace/store';

interface Props {
  userInitial: string;
  userName: string;
  tierLabel: string;
}

export function WorkspaceSidebar({ userInitial, userName, tierLabel }: Props) {
  const pathname = usePathname();
  const setMobileSidebarOpen = useWorkspace((s) => s.setMobileSidebarOpen);
  const mobileOpen = useWorkspace((s) => s.mobileSidebarOpen);

  function isActive(href: string): boolean {
    if (href === '/app') return pathname === '/app';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className={`cc-sb${mobileOpen ? ' open' : ''}`}>
      <div className="cc-sb-top">
        <FusionMark size={26} />
        <div className="cc-wm">
          Nexo<span> AI</span>
        </div>
        <span className="cc-env">{tierLabel}</span>
      </div>

      <div className="cc-sb-scroll">
        {SUBSCRIBER_NAV.map((g) => (
          <div key={g.grp} className="cc-sb-grp">
            <div className="cc-gl">{g.grp}</div>
            <div className="cc-nav">
              {g.items.map((it) => (
                <Link
                  key={it.id}
                  href={it.href as Route}
                  className={`cc-nav-item${isActive(it.href) ? ' on' : ''}`}
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <span className="cc-ic">{it.ic}</span>
                  <span>{it.label}</span>
                  {it.live && <span className="cc-dot" />}
                  {it.ct && <span className="cc-ct">{it.ct}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cc-sb-foot">
        <div className="cc-ava">{userInitial}</div>
        <div className="cc-u">
          <div className="cc-u-n">{userName}</div>
          <div className="cc-u-r">{tierLabel} plan</div>
        </div>
        <button type="button" className="cc-cog" title="Settings">
          ⚙
        </button>
      </div>
    </aside>
  );
}
