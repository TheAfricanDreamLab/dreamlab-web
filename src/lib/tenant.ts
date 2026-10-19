import 'server-only';
import { cache } from 'react';
import { callGateway, incomingRequest } from './gateway';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  kinds: string[];
}

const RESERVED = new Set(['www', 'api', 'app', 'admin', 'platform', 'static', 'cdn', 'mail', 'docs', 'status', 'staging']);

/** The organisation whose site this is (<slug>.theafricandreamlab.com or <slug>.localhost), if any. */
export const currentTenant = cache(async (): Promise<TenantInfo | null> => {
  const request = await incomingRequest();
  const hostname = (request.host ?? '').split(':')[0]!.toLowerCase();
  const bases = [(process.env.NEXT_PUBLIC_SITE_DOMAIN ?? '').split(':')[0], 'localhost'].filter(Boolean) as string[];
  const base = bases.find((b) => hostname.endsWith(`.${b}`));
  if (!base) return null;
  const slug = hostname.slice(0, -(base.length + 1));
  if (!slug || slug.includes('.') || RESERVED.has(slug)) return null;
  const res = await callGateway<TenantInfo>('GET', `/v1/orgs/resolve/${encodeURIComponent(slug)}`, { request });
  return res.ok ? res.data : null;
});

export function siteDomain(): string {
  return process.env.NEXT_PUBLIC_SITE_DOMAIN ?? 'theafricandreamlab.com';
}
