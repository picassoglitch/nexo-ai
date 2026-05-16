import { setRequestLocale } from 'next-intl/server';
import { getSessionUser } from '@/lib/auth/session';

const STATIC_MEMBERS: Array<{ id: string; name: string; email: string; role: string; badge: 'gr' | 'cy' | 'pu' | 'am'; status: string }> = [];

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSessionUser();
  const meta = session?.user.user_metadata ?? {};
  const me = {
    id: session?.user.id ?? 'me',
    name:
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      session?.user.email?.split('@')[0] ||
      'Operator',
    email: session?.user.email ?? 'operator@nexo.ai',
    role: session?.role ?? 'VIEWER',
    badge: (session?.role === 'SUPER_ADMIN' ? 'pu' : 'gr') as 'pu' | 'gr',
    status: 'Activo · sesión actual',
  };

  const members = [me, ...STATIC_MEMBERS];

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Miembros activos</div>
          <div className="cc-mod-stat-v gr">{members.length}</div>
          <div className="cc-mod-stat-sub">{members.filter((m) => m.role === 'SUPER_ADMIN').length} super admin</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Invitaciones pendientes</div>
          <div className="cc-mod-stat-v">0</div>
          <div className="cc-mod-stat-sub">Nadie pendiente</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Roles definidos</div>
          <div className="cc-mod-stat-v">6</div>
          <div className="cc-mod-stat-sub">Super Admin · Admin · Operator · Editor · Viewer · Client</div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Miembros</div>
        <div className="cc-mod-list">
          {members.map((m) => (
            <div key={m.id} className="cc-mod-row">
              <div className="cc-mod-ic">{m.name.charAt(0).toUpperCase()}</div>
              <div className="cc-mod-body">
                <div className="cc-mod-name">
                  {m.name}{' '}
                  <span className={`cc-mod-badge ${m.badge}`}>{m.role.replace('_', ' ')}</span>
                </div>
                <div className="cc-mod-sub">{m.email}</div>
              </div>
              <div className="cc-mod-right">
                <b>{m.status}</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Invitar miembro</div>
        <div className="cc-mod-form">
          <div className="cc-mod-field">
            <label>Correo</label>
            <input type="email" placeholder="nombre@dominio.com" disabled />
          </div>
          <div className="cc-mod-field">
            <label>Rol</label>
            <select disabled>
              <option>Viewer</option>
              <option>Editor</option>
              <option>Operator</option>
              <option>Admin</option>
            </select>
          </div>
          <div className="cc-mod-toggle">
            <div className="cc-mod-toggle-text">
              <span className="t">Notificar por correo</span>
              <span className="s">Te respondemos en un día hábil.</span>
            </div>
            <div className="cc-mod-switch on" />
          </div>
          <p
            style={{
              fontFamily: 'var(--cc-mono), monospace',
              fontSize: 11,
              color: 'var(--cc-txt-4)',
            }}
          >
            ▸ Invitaciones se cablean al flujo Resend en step 07.
          </p>
        </div>
      </div>
    </div>
  );
}
