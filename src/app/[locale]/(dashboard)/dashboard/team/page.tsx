import { setRequestLocale } from 'next-intl/server';
import { getSessionUser, isSuperAdminEmail } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamRoleSelect } from '@/components/dashboard/team-role-select';
import { TeamTierSelect } from '@/components/dashboard/team-tier-select';
import { TeamInviteForm } from '@/components/dashboard/team-invite-form';
import { PartnerEngineSelect, type EngineOption } from '@/components/dashboard/partner-engine-select';
import type { SubscriptionTier, UserRole } from '@/lib/auth/session';

export const metadata = { title: 'Team & Roles' };

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  tier: SubscriptionTier;
  created_at: string;
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  const supabase = await createClient();

  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, tier, created_at')
    .order('created_at');
  const profiles = (profilesRaw ?? []) as ProfileRow[];

  const canEdit = session?.role === 'SUPER_ADMIN' || session?.role === 'ADMIN';
  const paidCount = profiles.filter((p) => p.tier !== 'FREE').length;
  const partnerCount = profiles.filter((p) => p.tier === 'PARTNER').length;

  // Engine catalog for the PartnerEngineSelect dropdown. We pull all engines
  // + their current owner so the select can disable engines already claimed
  // by a different partner. Joining owner email via a follow-up profiles
  // lookup keeps the query simple (no PostgREST embedding).
  let engineOptions: EngineOption[] = [];
  if (canEdit && partnerCount > 0) {
    const admin = createAdminClient();
    const { data: enginesRaw } = await admin
      .from('engines')
      .select('id, slug, name, owner_user_id')
      .order('name');
    const engines = (enginesRaw ?? []) as Array<{
      id: string;
      slug: string;
      name: string;
      owner_user_id: string | null;
    }>;
    const ownerIds = engines
      .map((e) => e.owner_user_id)
      .filter((x): x is string => x !== null);
    let ownersById = new Map<string, string | null>();
    if (ownerIds.length > 0) {
      const { data: owners } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', ownerIds);
      ownersById = new Map(
        (owners ?? []).map((o) => [o.id as string, (o.email as string | null) ?? null]),
      );
    }
    engineOptions = engines.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      ownerUserId: e.owner_user_id,
      ownerEmail: e.owner_user_id ? (ownersById.get(e.owner_user_id) ?? null) : null,
    }));
  }
  // Cheap lookup by user → currently owned engine id (for default in the select).
  const ownedEngineByUser = new Map<string, string>();
  for (const e of engineOptions) {
    if (e.ownerUserId) ownedEngineByUser.set(e.ownerUserId, e.id);
  }

  return (
    <div className="cc-scroll">
      <div className="cc-mod-statgrid">
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Miembros activos</div>
          <div className="cc-mod-stat-v gr">{profiles.length}</div>
          <div className="cc-mod-stat-sub">
            {profiles.filter((p) => p.role === 'SUPER_ADMIN').length} super admin
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Suscripciones pagas</div>
          <div className="cc-mod-stat-v gr">{paidCount}</div>
          <div className="cc-mod-stat-sub">
            {profiles.filter((p) => p.tier === 'PRO').length} Pro ·{' '}
            {partnerCount} Partner ·{' '}
            {profiles.filter((p) => p.tier === 'ALL_ACCESS').length} All-Access
          </div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Invitaciones pendientes</div>
          <div className="cc-mod-stat-v">0</div>
          <div className="cc-mod-stat-sub">Nadie pendiente</div>
        </div>
        <div className="cc-mod-stat">
          <div className="cc-mod-stat-l">Roles definidos</div>
          <div className="cc-mod-stat-v">6</div>
          <div className="cc-mod-stat-sub">
            SA · Admin · Operator · Editor · Viewer · Client
          </div>
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Miembros</div>
        <div className="cc-mod-list">
          {profiles.map((p) => {
            const isSelf = p.id === session?.user.id;
            const isEnvLocked = isSuperAdminEmail(p.email);
            const displayName = p.full_name || p.email?.split('@')[0] || 'Sin nombre';
            return (
              <div key={p.id} className="cc-mod-row">
                <div className="cc-mod-ic">{displayName.charAt(0).toUpperCase()}</div>
                <div className="cc-mod-body">
                  <div className="cc-mod-name">
                    {displayName}{' '}
                    {isSelf && <span className="cc-mod-badge gr">tú</span>}{' '}
                    {isEnvLocked && (
                      <span className="cc-mod-badge pu" title="SUPER_ADMIN_EMAILS env var">
                        env-locked
                      </span>
                    )}
                  </div>
                  <div className="cc-mod-sub">{p.email}</div>
                </div>
                <div
                  className="cc-mod-right"
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {canEdit ? (
                    <>
                      <TeamTierSelect userId={p.id} current={p.tier} />
                      {/* Owner-engine picker — only renders for PARTNER rows.
                          Hidden on FREE/PRO/ALL_ACCESS users since the column
                          on engines is partner-specific (no other tier owns
                          engines today). */}
                      {p.tier === 'PARTNER' && (
                        <PartnerEngineSelect
                          userId={p.id}
                          currentEngineId={ownedEngineByUser.get(p.id) ?? null}
                          engines={engineOptions}
                        />
                      )}
                      <TeamRoleSelect
                        userId={p.id}
                        current={p.role}
                        envLocked={isEnvLocked}
                      />
                    </>
                  ) : (
                    <>
                      <span className="cc-mod-badge gr">{p.tier.replace('_', '-')}</span>
                      <span className="cc-mod-badge">{p.role.replace('_', ' ')}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cc-mod-section">
        <div className="cc-mod-sl">Invitar miembro</div>
        <TeamInviteForm />
      </div>
    </div>
  );
}
