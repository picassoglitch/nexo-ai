// Verbatim port of the prototype's NAV array.
// Counts (ct) are placeholder static values matching the prototype reference;
// these become real Supabase queries in CHECKPOINT 2.

export type NavItem = {
  id: string;
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
      { id: 'overview', ic: '◰', label: 'Overview' },
      { id: 'ops', ic: '⬡', label: 'Operaciones', live: true },
    ],
  },
  {
    grp: 'Operaciones',
    items: [
      { id: 'bots', ic: '🤖', label: 'Bots', ct: '62' },
      { id: 'models', ic: '◈', label: 'AI Models', ct: '9' },
      { id: 'streams', ic: '▶', label: 'Streams', live: true },
      { id: 'autos', ic: '⟳', label: 'Automations', ct: '31' },
      { id: 'queues', ic: '≡', label: 'Queues', ct: '7' },
    ],
  },
  {
    grp: 'Contenido',
    items: [
      { id: 'content', ic: '✂', label: 'Clips & VODs', ct: '418' },
      { id: 'publish', ic: '↗', label: 'Publishing' },
      { id: 'uploads', ic: '⬆', label: 'Uploads' },
    ],
  },
  {
    grp: 'Inteligencia',
    items: [
      { id: 'analytics', ic: '◑', label: 'Analytics' },
      { id: 'revenue', ic: '$', label: 'Revenue' },
    ],
  },
  {
    grp: 'Infra',
    items: [
      { id: 'infra', ic: '▤', label: 'Workers & GPU' },
      { id: 'api', ic: '⌘', label: 'API & Keys' },
      { id: 'notifs', ic: '🔔', label: 'Notifications', ct: '3' },
    ],
  },
  {
    grp: 'Organización',
    items: [
      { id: 'team', ic: '👥', label: 'Team & Roles' },
      { id: 'clients', ic: '◎', label: 'Clients', ct: '4' },
      { id: 'billing', ic: '▦', label: 'Billing' },
      { id: 'settings', ic: '⚙', label: 'Settings' },
    ],
  },
];

export const PAGE_META: Record<string, [string, string]> = {
  overview: ['Overview', 'Resumen ejecutivo de toda la plataforma.'],
  ops: ['Operaciones', 'Todos los sistemas, agentes y trabajos de IA — estado en vivo.'],
  bots: ['Bots', 'Cada sistema operativo, por categoría.'],
  models: ['AI Models', 'Modelos, prompts, personas y generaciones.'],
  streams: ['Streams', 'Streams en vivo y su estado.'],
  autos: ['Automations', 'Flujos automatizados y disparadores.'],
  revenue: ['Revenue', 'Ingresos por sistema, MRR y tendencias.'],
  team: ['Team & Roles', 'Usuarios, permisos y registro de actividad.'],
  infra: ['Workers & GPU', 'Nodos, GPU, APIs, almacenamiento y costos.'],
};
