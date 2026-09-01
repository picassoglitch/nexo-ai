import type { Route } from 'next';

// Subscriber workspace navigation.
//
// Reworked from the old three groups (Tu cuenta / Plataforma / Ajustes), which
// led with account admin — the first four items a new subscriber saw were
// Inicio, Suscripción, Uso, Facturación. What they actually came to do (run an
// engine) sat below the fold of attention.
//
// Now: what you do first, then what you pay, then where you get help. Group
// labels are plain Spanish, not product nouns.
export interface WsNavItem {
  id: string;
  href: Route;
  icon: string;
  label: string;
  /** Short label for the mobile tab bar, where space is tight. */
  tabLabel?: string;
  /** Shown in the mobile tab bar (max 4 + "Más"). */
  primary?: boolean;
}

export interface WsNavGroup {
  id: string;
  label: string;
  items: WsNavItem[];
}

export const WS_NAV: WsNavGroup[] = [
  {
    id: 'work',
    label: 'Tu trabajo',
    items: [
      { id: 'home', href: '/app' as Route, icon: '◉', label: 'Inicio', primary: true },
      {
        id: 'engines',
        href: '/app/engines' as Route,
        icon: '◈',
        label: 'Mis engines',
        tabLabel: 'Engines',
        primary: true,
      },
      { id: 'history', href: '/app/history' as Route, icon: '≡', label: 'Historial' },
    ],
  },
  {
    id: 'plan',
    // "Suscripción / Uso / Facturación" were three sibling nav items with no
    // stated relationship. They're all one question — what you pay and what
    // you've used — so they're one group now.
    label: 'Tu plan',
    items: [
      { id: 'subscription', href: '/app/subscription' as Route, icon: '◆', label: 'Plan', tabLabel: 'Plan', primary: true },
      { id: 'usage', href: '/app/usage' as Route, icon: '◑', label: 'Uso y tokens' },
      { id: 'billing', href: '/app/billing' as Route, icon: '▦', label: 'Pagos y facturas' },
    ],
  },
  {
    id: 'support',
    label: 'Ayuda',
    items: [
      { id: 'messages', href: '/app/messages' as Route, icon: '✉', label: 'Mensajes', primary: true },
      { id: 'help', href: '/app/help' as Route, icon: '?', label: 'Preguntas frecuentes', tabLabel: 'Ayuda' },
      { id: 'settings', href: '/app/settings' as Route, icon: '⚙', label: 'Tu cuenta' },
    ],
  },
];

export const WS_TABS: WsNavItem[] = WS_NAV.flatMap((g) => g.items).filter((i) => i.primary);

// Page chrome: the title and one-line explanation in the top bar. Keyed by the
// locale-stripped pathname. `action` names the page's primary CTA where it has
// one — the top bar renders it so the main action is in the same place on
// every page.
export interface WsPageMeta {
  title: string;
  sub: string;
  action?: { label: string; href: Route };
}

export const WS_PAGE_META: Record<string, WsPageMeta> = {
  '/app': {
    title: 'Inicio',
    sub: 'Tus engines, tu plan y lo que sigue.',
    action: { label: 'Ver mis engines', href: '/app/engines' as Route },
  },
  '/app/engines': {
    title: 'Mis engines',
    sub: 'Todo lo que puedes encender con tu plan actual.',
  },
  '/app/history': {
    title: 'Historial',
    sub: 'Cada trabajo que has corrido, en prueba o en vivo.',
  },
  '/app/subscription': {
    title: 'Tu plan',
    sub: 'Qué incluye, cuánto cuesta y cómo cambiarlo.',
  },
  '/app/usage': {
    title: 'Uso y tokens',
    sub: 'Lo que llevas gastado este mes y lo que te queda.',
  },
  '/app/billing': {
    title: 'Pagos y facturas',
    sub: 'Tus cargos, tu método de pago y tus comprobantes.',
  },
  '/app/messages': {
    title: 'Mensajes',
    sub: 'Habla directo con el equipo Nexo. Nadie más lo ve.',
  },
  '/app/help': {
    title: 'Preguntas frecuentes',
    sub: 'Lo que casi todos preguntan en sus primeros días.',
  },
  '/app/settings': {
    title: 'Tu cuenta',
    sub: 'Tu nombre, tu correo, tu contraseña y tu idioma.',
  },
};

const FALLBACK_META: WsPageMeta = { title: 'Tu espacio', sub: '' };

/** Longest-prefix match so /app/engines/nexoclip inherits the engines chrome. */
export function pageMetaFor(pathname: string): WsPageMeta {
  const exact = WS_PAGE_META[pathname];
  if (exact) return exact;
  // '/app' is excluded from prefix matching: it prefixes every other route, so
  // it would win for anything without its own entry.
  const match = Object.keys(WS_PAGE_META)
    .filter((k) => k !== '/app' && pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return (match && WS_PAGE_META[match]) || FALLBACK_META;
}
