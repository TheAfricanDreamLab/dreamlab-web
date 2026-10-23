'use client';

import { useActionState } from 'react';
import { createRole, deleteRole, updateRole } from '@/app/actions/security';
import { SubmitButton } from '@/components/auth/forms';
import { TextInput } from '@/components/ui/fields';
import { Notice } from '@/components/ui/primitives';
import type { FormState } from '@/lib/forms';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from '@/lib/labels';
import { OrgField } from '@/components/app/org-binding';

const initial: FormState = {};

function PermissionPicker({ selected = [] }: { selected?: string[] }) {
  return (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((g) => (
        <fieldset key={g.title} className="space-y-1.5">
          <legend className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{g.title}</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {g.permissions.map((p) => (
              <label key={p} className="flex min-h-11 items-start gap-2.5 rounded-lg px-2 py-2.5 text-[14px] text-body hover:bg-surface sm:min-h-0 sm:py-1.5 sm:text-[13px]">
                <input type="checkbox" name="permissions" value={p} defaultChecked={selected.includes(p)} className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]" />
                <span>{PERMISSION_LABELS[p] ?? p}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function CreateRoleForm() {
  const [state, action] = useActionState(createRole, initial);
  return (
    <form action={action} className="space-y-4">
      <OrgField />
      <TextInput label="Role name" name="name" required minLength={2} maxLength={80} placeholder="Regional lead" defaultValue={state.values?.name} error={state.fields?.name} />
      <TextInput label="What it’s for (optional)" name="description" maxLength={400} defaultValue={state.values?.description} />
      <div className="space-y-2">
        <p className="text-[13px] font-semibold text-ink">People with this role can…</p>
        <PermissionPicker />
      </div>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.notice && <Notice tone="success">{state.notice}</Notice>}
      <SubmitButton pending="Creating…">Create role</SubmitButton>
    </form>
  );
}

export function EditRoleForm({ roleKey, permissions, assignedCount }: { roleKey: string; permissions: string[]; assignedCount: number }) {
  const [saved, saveAction] = useActionState(updateRole, initial);
  const [removed, removeAction] = useActionState(deleteRole, initial);
  return (
    <div className="space-y-3">
      <form action={saveAction} className="space-y-3">
        <OrgField />
        <input type="hidden" name="roleKey" value={roleKey} />
        <PermissionPicker selected={permissions} />
        {saved.error && <Notice tone="error">{saved.error}</Notice>}
        {saved.notice && <Notice tone="success">{saved.notice}</Notice>}
        <SubmitButton pending="Saving…" variant="secondary">
          Save permissions
        </SubmitButton>
      </form>
      <form action={removeAction}>
        <OrgField />
        <input type="hidden" name="roleKey" value={roleKey} />
        {removed.error && <Notice tone="error" className="mb-2">{removed.error}</Notice>}
        <button type="submit" disabled={assignedCount > 0} className="text-[13px] font-semibold text-danger-ink disabled:cursor-not-allowed disabled:text-faint" title={assignedCount > 0 ? 'Take the role away from people first' : undefined}>
          Delete this role
        </button>
      </form>
    </div>
  );
}
