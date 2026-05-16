// Verbatim port of the prototype's NAV array, extended with href for routing.
// Each module gets a real /dashboard/<slug> route in CP-extension.

export type NavItem = {
  id: string;
  href: string; // locale-agnostic; next-intl Link prefixes /es when needed
  ic: string;
  label: string;
  ct?: string;
  live?: boolean;
};

export type NavGroup = { grp: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    grp: 'Resumen',
    items: [
      { id: 'overview', href: '/dashboard/overview', ic: '◰', label: 'Overview' },
      { id: 'ops', href: '/dashboard', ic: '⬡', label: 'Operaciones', live: true },
    ],
  },
  {
    grp: 'Operaciones',
    items: [
      { id: 'bots', href: '/dashboard/bots', ic: '🤖', label: 'Bots', ct: '62' },
      { id: 'models', href: '/dashboard/models', ic: '◈', label: 'AI Models', ct: '9' },
      { id: 'streams', href: '/dashboard/streams', ic: '▶', label: 'Streams', live: true },
      { id: 'autos', href: '/dashboard/automations', ic: '⟳', label: 'Automations', ct: '31' },
      { id: 'queues', href: '/dashboard/queues', ic: '≡', label: 'Queues', ct: '7' },
    ],
  },
  {
    grp: 'Contenido',
    items: [
      { id: 'content', href: '/dashboard/clips', ic: '✂', label: 'Clips & VODs', ct: '418' },
      { id: 'publish', href: '/dashboard/publishing', ic: '↗', label: 'Publishing' },
      { id: 'uploads', href: '/dashboard/uploads', ic: '⬆', label: 'Uploads' },
    ],
  },
  {
    grp: 'Inteligencia',
    items: [
      { id: 'analytics', href: '/dashboard/analytics', ic: '◑', label: 'Analytics' },
      { id: 'revenue', href: '/dashboard/revenue', ic: '$', label: 'Revenue' },
    ],
  },
  {
    grp: 'Infra',
    items: [
      { id: 'infra', href: '/dashboard/infra', ic: '▤', label: 'Workers & GPU' },
      { id: 'api', href: '/dashboard/api', ic: '⌘', label: 'API & Keys' },
      { id: 'notifs', href: '/dashboard/notifications', ic: '🔔', label: 'Notifications', ct: '3' },
    ],
  },
  {
    grp: 'Organización',
    items: [
      { id: 'team', href: '/dashboard/team', ic: '👥', label: 'Team & Roles' },
      { id: 'clients', href: '/dashboard/clients', ic: '◎', label: 'Clients', ct: '4' },
      { id: 'billing', href: '/dashboard/billing', ic: '▦', label: 'Billing' },
      { id: 'settings', href: '/dashboard/settings', ic: '⚙', label: 'Settings' },
    ],
  },
];

// ============================================================
// Subscriber workspace navigation — Free / Pro / All-Access tier UI.
// Mounted at /app/*. Distinct from the admin /dashboard sidebar.
// ============================================================
export const SUBSCRIBER_NAV: NavGroup[] = [
  {
    grp: 'Tu cuenta',
    items: [
      { id: 'home', href: '/app', ic: '◉', label: 'Inicio' },
      { id: 'subscription', href: '/app/subscription', ic: '◈', label: 'Suscripción' },
      { id: 'usage', href: '/app/usage', ic: '◑', label: 'Uso' },
      { id: 'billing', href: '/app/billing', ic: '▦', label: 'Facturación' },
    ],
  },
  {
    grp: 'Plataforma',
    items: [
      { id: 'mybots', href: '/app/bots', ic: '🤖', label: 'Mis bots' },
      { id: 'history', href: '/app/history', ic: '≡', label: 'Historial' },
    ],
  },
  {
    grp: 'Ajustes',
    items: [
      { id: 'profile', href: '/app/settings', ic: '⚙', label: 'Perfil & seguridad' },
      { id: 'help', href: '/app/help', ic: '?', label: 'Ayuda' },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/dashboard': {
    title: 'Operaciones',
    sub: 'Todos los sistemas, agentes y trabajos de IA — estado en vivo.',
  },
  '/dashboard/overview': {
    title: 'Overview',
    sub: 'Resumen ejecutivo de toda la plataforma.',
  },
  '/dashboard/bots': {
    title: 'Bots',
    sub: 'Cada sistema operativo, por categoría.',
  },
  '/dashboard/models': {
    title: 'AI Models',
    sub: 'Modelos, prompts, personas y generaciones.',
  },
  '/dashboard/streams': {
    title: 'Streams',
    sub: 'Streams en vivo y su estado.',
  },
  '/dashboard/automations': {
    title: 'Automations',
    sub: 'Flujos automatizados y disparadores.',
  },
  '/dashboard/queues': {
    title: 'Queues',
    sub: 'Cola de trabajos por worker y prioridad.',
  },
  '/dashboard/clips': {
    title: 'Clips & VODs',
    sub: 'Biblioteca de cortos generados y VODs originales.',
  },
  '/dashboard/publishing': {
    title: 'Publishing',
    sub: 'Distribución multi-plataforma y schedules.',
  },
  '/dashboard/uploads': {
    title: 'Uploads',
    sub: 'Archivos subidos, ingesta y procesamiento.',
  },
  '/dashboard/analytics': {
    title: 'Analytics',
    sub: 'Métricas, tendencias y comportamiento por sistema.',
  },
  '/dashboard/revenue': {
    title: 'Revenue',
    sub: 'Ingresos por sistema, MRR y tendencias.',
  },
  '/dashboard/infra': {
    title: 'Workers & GPU',
    sub: 'Nodos, GPU, regiones y costos de infraestructura.',
  },
  '/dashboard/api': {
    title: 'API & Keys',
    sub: 'Llaves de API por proveedor, costos y límites.',
  },
  '/dashboard/notifications': {
    title: 'Notifications',
    sub: 'Alertas del sistema y eventos sin leer.',
  },
  '/dashboard/team': {
    title: 'Team & Roles',
    sub: 'Usuarios, permisos y registro de actividad.',
  },
  '/dashboard/clients': {
    title: 'Clients',
    sub: 'Cuentas de cliente, accesos y proyectos activos.',
  },
  '/dashboard/billing': {
    title: 'Billing',
    sub: 'Plan actual, facturas y método de pago.',
  },
  '/dashboard/settings': {
    title: 'Settings',
    sub: 'Cuenta, organización, notificaciones y seguridad.',
  },
  '/app': {
    title: 'Tu espacio',
    sub: 'Resumen de tu suscripción, uso y bots activos.',
  },
  '/app/subscription': {
    title: 'Suscripción',
    sub: 'Tu plan actual, cambios de tier y método de pago.',
  },
  '/app/usage': {
    title: 'Uso',
    sub: 'Tu actividad en el período de facturación actual.',
  },
  '/app/billing': {
    title: 'Facturación',
    sub: 'Historial de facturas y método de pago.',
  },
  '/app/bots': {
    title: 'Mis bots',
    sub: 'Sistemas disponibles en tu tier actual.',
  },
  '/app/history': {
    title: 'Historial',
    sub: 'Tus ejecuciones recientes y trabajos completados.',
  },
  '/app/settings': {
    title: 'Perfil & seguridad',
    sub: 'Tu cuenta personal, contraseña y 2FA.',
  },
  '/app/help': {
    title: 'Ayuda',
    sub: 'Docs, contacto y estado del sistema.',
  },
};
