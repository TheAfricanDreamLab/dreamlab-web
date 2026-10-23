'use client';

import { useActionState } from 'react';
import { assignRole, inviteMember } from '@/app/actions/org';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { INVITABLE_ROLES } from '@/lib/labels';
import { OrgField } from '@/components/app/org-binding';

type RoleOption = { key: string; label: string; hint: string };

export function InviteForm({ orgPending, canAssignRoles, customRoles = [] }: { orgPending: boolean; canAssignRoles: boolean; customRoles?: RoleOption[] }) {
  const [state, action] = useActionState(inviteMember, {} as FormState);
  // While in review only co-admins can be invited; without role rights only learners.
  const all = [...INVITABLE_ROLES, ...customRoles];
  const roles = orgPending ? INVITABLE_ROLES.filter((r) => r.key === 'org_admin') : canAssignRoles ? all : INVITABLE_ROLES.filter((r) => r.key === 'learner');
  return (
    <form action={action} className="space-y-4">
      <OrgField />
      <TextInput label="Email or phone" name="identifier" required placeholder="ada@company.com or 0803 000 0000" defaultValue={state.values?.identifier} />
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-semibold text-ink">As</legend>
        <div className="grid gap-2 min-[400px]:grid-cols-2">
          {roles.map((r, i) => (
            <label key={r.key} className="flex cursor-pointer items-start gap-2.5 rounded-[var(--radius-field)] bg-card px-3 py-2.5 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-primary">
              <input type="radio" name="role" value={r.key} defaultChecked={(state.values?.role ?? roles[0]?.key) === r.key || (!state.values && i === 0)} className="mt-1 accent-[var(--color-primary)]" />
              <span>
                <span className="block text-[13.5px] font-semibold text-ink">{r.label}</span>
                <span className="block text-[12px] text-muted">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <SubmitButton pending="Sending…">Send invitation</SubmitButton>
    </form>
  );
}

export function AddRoleForm({ membershipId, has, customRoles = [] }: { membershipId: string; has: string[]; customRoles?: RoleOption[] }) {
  const [state, action] = useActionState(assignRole, {} as FormState);
  const options = [...INVITABLE_ROLES, ...customRoles].filter((r) => !has.includes(r.key));
  if (options.length === 0) return null;
  return (
    <form action={action} className="flex min-w-0 flex-wrap items-center gap-2">
      <OrgField />
      <input type="hidden" name="membershipId" value={membershipId} />
      <select name="roleKey" className="h-10 max-w-full rounded-lg bg-card px-2 text-[13.5px] ring-1 ring-line-strong sm:h-8 sm:text-[12.5px]" aria-label="Add a role">
        {options.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </select>
      <button type="submit" className="h-10 rounded-lg px-3 text-[13.5px] font-semibold text-link hover:bg-success-tint sm:h-8 sm:px-2.5 sm:text-[12.5px]">
        Add
      </button>
      {state.error && <span className="text-[12px] text-danger-ink">{state.error}</span>}
    </form>
  );
}
