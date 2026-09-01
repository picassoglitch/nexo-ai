import { Familjen_Grotesk, Space_Mono } from 'next/font/google';
import { getSessionUser, requireUser } from '@/lib/auth/session';
import { BfcacheGuard } from '@/components/auth/bfcache-guard';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';
import { WorkspaceProfileSubscriber } from '@/components/workspace/workspace-profile-subscriber';
import { effectiveTier, isAdminRole, tierLabelShort } from '@/lib/billing/tiers';
import { countUnreadForUser } from '@/lib/messages/messages-data';
import { getTokenBalance } from '@/lib/usage/tokens';
import './workspace.css';

// Same two families as the public site, so signing in doesn't feel like
// landing on a different product. (Was Inter + Space Grotesk + JetBrains Mono,
// none of which appear anywhere else in the brand.)
const display = Familjen_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--ws-font-display',
  display: 'swap',
});
const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--ws-font-mono',
  display: 'swap',
});

/** Below this, the top-bar token chip turns amber. */
const LOW_TOKEN_RATIO = 0.15;

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/app');
  const session = await getSessionUser();
  const email = session?.user.email ?? 'operator@nexo.ai';
  const meta = session?.user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    email.split('@')[0] ||
    'Operator';
  const initial = fullName.charAt(0).toUpperCase();
  // Stored tier from profiles.tier — only matters for non-admin users.
  // Admins get effective VIP no matter what, via effectiveTier().
  // The sidebar pill shows the EFFECTIVE tier so the experience matches what
  // they can actually do — admins see "ALL-ACCESS" regardless of billing row.
  const role = session?.role ?? 'VIEWER';
  const isAdmin = isAdminRole(role);
  const storedTier = session?.tier ?? 'FREE';
  const tier = effectiveTier(role, storedTier);
  const tierLabel = isAdmin ? `${tierLabelShort(tier)} · ADMIN` : tierLabelShort(tier);

  // Sidebar badge + top-bar token chip. Both are best-effort: the layout
  // renders on EVERY navigation and after every server action, so a throw
  // here (missing table, admin client failure) would 500 the whole workspace
  // and leave actions succeeding against a page that can never re-render.
  const [unreadMessages, balance] = await Promise.all([
    session?.user.id
      ? countUnreadForUser(session.user.id).catch(() => 0)
      : Promise.resolve(0),
    session?.user.id
      ? getTokenBalance(session.user.id).catch(() => null)
      : Promise.resolve(null),
  ]);

  const tokensLabel = !balance
    ? '—'
    : balance.unlimited
      ? '∞'
      : balance.remaining.toLocaleString('es-MX');
  const tokenCap = balance ? balance.monthlyAllocation + balance.bonus : 0;
  const tokensLow =
    balance !== null && !balance.unlimited && tokenCap > 0
      ? balance.remaining / tokenCap < LOW_TOKEN_RATIO
      : false;

  return (
    <div className={`${display.variable} ${mono.variable}`}>
      <BfcacheGuard />
      {session?.user.id && <WorkspaceProfileSubscriber userId={session.user.id} />}
      <WorkspaceShell
        userInitial={initial}
        userName={fullName}
        tierLabel={tierLabel}
        isAdmin={isAdmin}
        unreadMessages={unreadMessages}
        tokensLabel={tokensLabel}
        tokensLow={tokensLow}
      >
        {children}
      </WorkspaceShell>
    </div>
  );
}
