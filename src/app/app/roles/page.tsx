import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CreateRoleForm, EditRoleForm } from '@/components/settings/role-forms';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { api } from '@/lib/gateway';
import { PERMISSION_LABELS } from '@/lib/labels';
import { activeMembership, can, getMe } from '@/lib/me';

export const metadata: Metadata = { title: 'Roles' };

interface RoleRow {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  system: boolean;
  assignedCount: number;
}

export default async function RolesPage() {
  const me = await getMe();
  const active = activeMembership(me);
  if (!active || !can(me, 'org.roles.manage')) redirect('/app');
  const roles = await api<{ items: RoleRow[] }>('GET', `/v1/orgs/${active.org.id}/roles`);
  const custom = roles.ok ? roles.data.items.filter((r) => !r.system) : [];
  const builtIn = roles.ok ? roles.data.items.filter((r) => r.system) : [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">{active.org.name}</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Roles</h1>
        <p className="max-w-2xl text-[14.5px] text-muted">
          Built-in roles cover most needs. When they don’t, make your own: pick exactly what people with the role can do. Changes apply at once.
        </p>
      </header>
      {!roles.ok && <Notice tone="error">{roles.error.message}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <h2 className="border-b border-line px-6 py-4 text-[17px] font-bold">Your custom roles</h2>
            {custom.length === 0 ? (
              <p className="px-6 py-5 text-[14px] text-muted">None yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {custom.map((r) => (
                  <li key={r.key}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-6 py-4">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold text-ink">{r.name}</span>
                          <span className="block text-[12.5px] text-muted">{r.description || `${r.permissions.length} permissions`}</span>
                        </span>
                        <Badge>{r.assignedCount === 1 ? '1 person' : `${r.assignedCount} people`}</Badge>
                        <span aria-hidden className="text-muted group-open:rotate-180">
                          ▾
                        </span>
                      </summary>
                      <div className="px-6 pb-5">
                        <EditRoleForm roleKey={r.key} permissions={r.permissions} assignedCount={r.assignedCount} />
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="overflow-hidden">
            <h2 className="border-b border-line px-6 py-4 text-[17px] font-bold">Built-in roles</h2>
            <ul className="divide-y divide-line">
              {builtIn.map((r) => (
                <li key={r.key} className="space-y-1 px-6 py-3.5">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                    {r.name} <span className="text-[12px] font-normal text-muted">{r.assignedCount > 0 ? `· ${r.assignedCount}` : ''}</span>
                  </p>
                  <p className="text-[12.5px] text-muted">{r.permissions.map((p) => PERMISSION_LABELS[p] ?? p).join(' · ')}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card className="space-y-4 p-6">
          <h2 className="text-[17px] font-bold">Make a role</h2>
          <CreateRoleForm />
        </Card>
      </div>
    </div>
  );
}
