import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { CREDENTIAL_KIND_LABELS, type Credential, pct, verifyHref } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'My credentials' };

/** Programme graduations and course certificates, each with a public check page to share (CRED-1). */
export default async function CredentialsPage() {
  const res = await api<{ items: Credential[] }>('GET', '/v1/learning/me/credentials');

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Eyebrow tone="gold">Credentials</Eyebrow>
        <h1 className="text-[30px] font-extrabold">My credentials</h1>
        <p className="text-[14.5px] text-muted">Your graduation and course certificates. Share a credential’s check link: anyone can confirm it there.</p>
      </header>

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : res.data.items.length === 0 ? (
        <Card className="p-8 text-center text-[14.5px] text-muted">No credentials yet. Finishing a course earns a certificate; graduating from a programme earns its credential.</Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {res.data.items.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{c.title}</span>
                  <span className="block text-[13px] text-muted">
                    {CREDENTIAL_KIND_LABELS[c.kind]} · {c.issuerName} · {calendarDate(c.issuedAt.slice(0, 10))}
                    {c.scorePct !== null ? ` · ${pct(c.scorePct)}` : ''}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {c.revoked && <Badge tone="danger">Revoked</Badge>}
                  <Link href={verifyHref(c.code)} className="min-h-10 content-center font-mono text-[13px] font-semibold text-link hover:underline">
                    {c.code}
                    <span className="sr-only"> (check page)</span>
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
