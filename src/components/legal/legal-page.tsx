// Shared shell for /legal/terms and /legal/privacy. Renders the public site
// nav + footer around the document, so legal pages match the landing.
// Server component — nothing here needs client JS.
//
// Server pages pass `title`, `lastUpdated`, and the document body as
// children. The body uses `.legal-prose` markup defined in globals.css.

import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';

interface Props {
  title: string;
  lastUpdated: string;
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, isAuthenticated, children }: Props) {
  return (
    <>
      <LandingNav isAuthenticated={isAuthenticated} />

      <main className="page-shell">
        <div className="page-shell-inner">
          <p className="page-kicker">Legal</p>
          <h1>{title}</h1>
          <p className="page-meta">Última actualización · {lastUpdated}</p>

          {/* The `legal-prose` class gives consistent typography for h2, h3,
              p, ul, code, strong inside legal documents. Defined in globals.css. */}
          <div className="legal-prose" style={{ marginTop: 36 }}>
            {children}
          </div>
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
