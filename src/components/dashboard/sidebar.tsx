'use client';

import type { Route } from 'next';
import { Link, usePathname } from '@/i18n/routing';
import { FusionMark } from './fusion-mark';
import { NAV } from './nav-data';
import { useDashboard } from '@/lib/dashboard/store';

interface Props {
  userInitial: string;
  userName: string;
  userRole: string;
  mobileOpen?: boolean;
}

export function Sidebar({ userInitial, userName, userRole, mobileOpen }: Props) {
  const pathname = usePathname();
  const setMobileSidebarOpen = useDashboard((s) => s.setMobileSidebarOpen);

  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className={`cc-sb${mobileOpen ? ' open' : ''}`}>
      <div className="cc-sb-top">
        <FusionMark size={26} />
        <div className="cc-wm">
          Nexo<span> AI</span>
        </div>
        <span className="cc-env">PROD</span>
      </div>

      <div className="cc-sb-scroll">
        {NAV.map((g) => (
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

        {/* Cross-nav: switch to subscriber view */}
        <div className="cc-sb-grp">
          <div className="cc-gl">Vista</div>
          <div className="cc-nav">
            <Link
              href={'/app' as Route}
              className="cc-nav-item"
              onClick={() => setMobileSidebarOpen(false)}
              title="Ver lo que ven tus subscribers"
            >
              <span className="cc-ic">◐</span>
              <span>Vista de subscriber</span>
              <span className="cc-ct">→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="cc-sb-foot">
        <div className="cc-ava">{userInitial}</div>
        <div className="cc-u">
          <div className="cc-u-n">{userName}</div>
          <div className="cc-u-r">{userRole}</div>
        </div>
        <Link
          href={'/dashboard/settings' as Route}
          className="cc-cog"
          title="Settings"
          onClick={() => setMobileSidebarOpen(false)}
        >
          ⚙
        </Link>
      </div>
    </aside>
  );
}
