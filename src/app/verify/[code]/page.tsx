import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicFooter, PublicHeader } from '@/components/site/public-header';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { calendarDate } from '@/lib/cohorts';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { CREDENTIAL_CODE, CREDENTIAL_KIND_LABELS, type Credential, pct, tenth } from '@/lib/outcomes';

export const metadata: Metadata = { title: 'Credential check', robots: { index: false, follow: false } };

type Props = { params: Promise<{ code: string }> };

/** The public check of one credential: valid or revoked, and what it certifies (CRED-1). */
export default async function CredentialPage({ params }: Props) {
  const code = decodeURIComponent((await params).code).toUpperCase();
  const res = CREDENTIAL_CODE.test(code) ? await api<Credential>('GET', `/v1/learning/credentials/${code}`) : null;

  return (
    <div className="min-h-dvh">
      <PublicHeader next="/verify/check" />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
        <Eyebrow tone="gold">Credential check</Eyebrow>
        {!res || (!res.ok && res.status === 404) ? (
          <Card className="space-y-3 p-6">
            <h1 className="text-[24px] font-extrabold">No credential has this code</h1>
            <p className="text-[14.5px] text-body">
              Check the code <span className="font-mono">{code}</span> against the certificate. Codes look like DL-7KQ2-M9TX-4HPR.
            </p>
            <Link href="/verify/check" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-link hover:underline">
              Try another code
            </Link>
          </Card>
        ) : !res.ok ? (
          <Notice tone="error">{friendlyError(res.error)}</Notice>
        ) : (
          <CredentialCard c={res.data} />
        )}
      </main>
      <PublicFooter />
    </div>
  );
}

function CredentialCard({ c }: { c: Credential }) {
  const valid = !c.revoked;
  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">{CREDENTIAL_KIND_LABELS[c.kind]}</p>
          <h1 className="text-[26px] font-extrabold">{c.title}</h1>
        </div>
        <Badge tone={valid ? 'green' : 'danger'}>{valid ? 'Valid' : 'Revoked'}</Badge>
      </div>
      {c.revoked && (
        <Notice tone="error">
          Revoked on {calendarDate(c.revoked.at.slice(0, 10))}: {c.revoked.reason}
        </Notice>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item label="Awarded to" value={c.recipientName} />
        <Item label="Issued by" value={c.issuerName} />
        <Item label="Issued on" value={calendarDate(c.issuedAt.slice(0, 10))} />
        <Item label="Code" value={c.code} mono />
        {c.scorePct !== null && <Item label="Score" value={pct(c.scorePct)} />}
        {c.creditHours !== null && <Item label="Credits" value={tenth(c.creditHours)} />}
      </dl>
      <p className="text-[13px] text-muted">This page is the record: a credential is valid only while it says so here.</p>
    </Card>
  );
}

function Item({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className={mono ? 'mt-1 font-mono text-[14.5px] font-semibold text-ink' : 'mt-1 text-[14.5px] font-semibold text-ink'}>{value}</dd>
    </div>
  );
}
