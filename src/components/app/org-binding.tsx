'use client';

import { createContext, useContext, type ReactNode } from 'react';

/*
 * The organisation a page was rendered for. The session is shared across tabs and organisation sites,
 * so the active organisation can change between rendering a form and submitting it (another tab, or
 * opening another organisation's site). Org-admin forms carry the organisation they were shown for,
 * and their actions refuse to act on a different one.
 */

const ActiveOrgContext = createContext<string | null>(null);

export function ActiveOrgProvider({ orgId, children }: { orgId: string | null; children: ReactNode }) {
  return <ActiveOrgContext.Provider value={orgId}>{children}</ActiveOrgContext.Provider>;
}

/** Put inside every form whose action works on the active organisation. */
export function OrgField() {
  const orgId = useContext(ActiveOrgContext);
  return orgId ? <input type="hidden" name="orgId" value={orgId} /> : null;
}
