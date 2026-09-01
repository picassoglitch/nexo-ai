'use client';

import type { Route } from 'next';
import { Link, usePathname } from '@/i18n/routing';
import { pageMetaFor } from './nav-config';
import { useWorkspace } from '@/lib/workspace/store';

interface Props {
  /** Pre-formatted balance, e.g. "742,310" or "∞". */
  tokensLabel: string;
  /** Drives the amber "running low" treatment on the chip. */
  tokensLow: boolean;
}

// Sticky page chrome. Three jobs: say where you are, keep the token balance
// visible everywhere (it decides whether you can run anything, and it used to
// live only on the home page), and put each page's primary action in the same
// place every time.
export function WorkspaceTopBar({ tokensLabel, tokensLow }: Props) {
  const pathname = usePathname();
  const meta = pageMetaFor(pathname);
  const openSidebar = useWorkspace((s) => s.setMobileSidebarOpen);

  return (
    <header className="ws-topbar">
      <button
        type="button"
        className="ws-icon-btn ws-menu-btn"
        aria-label="Abrir menú"
        onClick={() => openSidebar(true)}
      >
        ☰
      </button>

      <div className="ws-topbar-titles">
        <h1>{meta.title}</h1>
        <p>{meta.sub}</p>
      </div>

      <div className="ws-topbar-actions">
        <Link
          href={'/app/usage' as Route}
          className={`ws-chip${tokensLow ? ' low' : ''}`}
          title="Tus tokens de IA este mes"
        >
          <span className="ws-chip-label">Tokens</span>
          <b>{tokensLabel}</b>
        </Link>
        {meta.action && (
          <Link href={meta.action.href} className="ws-btn ws-btn-primary ws-btn-sm">
            {meta.action.label}
          </Link>
        )}
      </div>
    </header>
  );
}
