import type { LearningStats, PlatformOverview } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icons';
import { CountUp } from '@/components/ui/motion';
import { Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';

export const metadata: Metadata = { title: 'Platform overview' };

const n = (v: number) => v.toLocaleString('en-GB');
const plural = (count: number, one: string, many: string) => `${n(count)} ${count === 1 ? one : many}`;

/**
 * The platform admin's landing page, kept calm on purpose: four key figures, what needs attention
 * (only when something does), and the places admins go next. The detail lives on /app/admin/insights.
 */
export default async function PlatformOverviewPage() {
  const [overview, stats] = await Promise.all([
    api<PlatformOverview>('GET', '/v1/platform/overview'),
    api<LearningStats>('GET', '/v1/learning/admin/stats'),
  ]);
  const o = overview.ok ? overview.data : null;
  const s = stats.ok ? stats.data : null;

  const figures: Figure[] = [
    { label: 'People', value: o?.users.total, hint: o ? (o.users.new7d ? `+${n(o.users.new7d)} this week` : 'No new sign-ups this week') : undefined, href: '/app/admin/users' },
    {
      label: 'Organisations',
      value: o?.organizations.total,
      hint: o ? (o.organizations.pending ? `${n(o.organizations.pending)} waiting for approval` : 'All reviewed') : undefined,
      href: '/app/admin/organisations?status=active',
    },
    { label: 'Active learners', value: s?.activeLearners7d, hint: 'In the last 7 days', href: '/app/admin/insights#learning' },
    {
      label: 'Completions',
      value: s?.completions,
      hint: s ? (s.enrollments ? `${Math.round((s.completions / s.enrollments) * 100)}% of enrolments` : 'No enrolments yet') : undefined,
      href: '/app/admin/insights#learning',
    },
  ];

  const attention: { text: string; href: string; tone: 'gold' | 'danger' | 'muted' }[] = o
    ? [
        ...(o.organizations.pending ? [{ text: `${plural(o.organizations.pending, 'organisation is', 'organisations are')} waiting for approval`, href: '/app/admin/organisations?status=pending', tone: 'gold' as const }] : []),
        ...(o.users.suspended ? [{ text: `${plural(o.users.suspended, 'account is', 'accounts are')} suspended`, href: '/app/admin/users?status=suspended', tone: 'danger' as const }] : []),
        ...(o.users.banned ? [{ text: `${plural(o.users.banned, 'account is', 'accounts are')} banned`, href: '/app/admin/users?status=banned', tone: 'muted' as const }] : []),
      ]
    : [];

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h1 className="text-[30px] font-extrabold leading-tight sm:text-[38px]">Platform overview</h1>
          <p className="text-[14.5px] text-muted">What matters today, across every space.</p>
        </div>
        <Link href="/app/admin/insights" className="dl-press inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-link hover:underline">
          Open insights
          <Icon name="arrow" className="h-4 w-4" />
        </Link>
      </header>

      {(!overview.ok || !stats.ok) && (
        <div className="space-y-2">
          {!overview.ok && <Notice tone="error">{friendlyError(overview.error)}</Notice>}
          {!stats.ok && <Notice tone="error">{friendlyError(stats.error)}</Notice>}
        </div>
      )}

      <section aria-labelledby="key-figures" className="space-y-3">
        <h2 id="key-figures" className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          Key figures
        </h2>
        <ul className="dl-stagger -mx-3 grid grid-cols-2 gap-1 lg:grid-cols-4">
          {figures.map((f) => (
            <li key={f.label} className="min-w-0">
              <Link href={f.href} className="dl-lift block h-full rounded-[var(--radius-card)] px-3 py-3 hover:bg-card">
                <span className="block text-[13.5px] font-semibold text-body">{f.label}</span>
                <span className="block font-display text-[32px] font-extrabold leading-tight text-ink sm:text-[38px]">{f.value === undefined ? '—' : <CountUp value={f.value} />}</span>
                {f.hint && <span className="block text-[12.5px] text-muted">{f.hint}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {attention.length > 0 ? (
        <section aria-labelledby="attention" className="space-y-3">
          <h2 id="attention" className="text-[19px] font-bold">
            Needs your attention
          </h2>
          <ul className="dl-stagger -mx-3 space-y-1">
            {attention.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="dl-lift flex min-h-12 items-center gap-3 rounded-[var(--radius-card)] px-3 py-2.5 text-[14.5px] text-ink hover:bg-card">
                  <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${a.tone === 'gold' ? 'bg-gold' : a.tone === 'danger' ? 'bg-danger' : 'bg-muted'}`} />
                  <span className="min-w-0 flex-1">{a.text}</span>
                  <Icon name="arrow" className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        o && <p className="text-[14.5px] text-muted">Nothing needs your attention right now.</p>
      )}

      <section aria-labelledby="quick-links" className="space-y-3">
        <h2 id="quick-links" className="text-[19px] font-bold">
          Go to
        </h2>
        <ul className="dl-stagger grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <li key={q.href} className="min-w-0">
              <Link href={q.href} className="dl-lift flex h-full flex-col gap-2 rounded-[var(--radius-card)] bg-card px-4 py-4">
                <Icon name={q.icon} className="h-5 w-5 text-primary" />
                <span className="font-semibold text-ink">{q.label}</span>
                <span className="text-[12.5px] text-muted">{q.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type Figure = { label: string; value: number | undefined; hint?: string; href: string };

const QUICK_LINKS: { href: string; label: string; text: string; icon: IconName }[] = [
  { href: '/app/admin/users', label: 'People', text: 'Find, suspend or restore accounts.', icon: 'users' },
  { href: '/app/admin/organisations', label: 'Organisations', text: 'Approve and manage spaces.', icon: 'building' },
  { href: '/app/admin/catalog', label: 'Catalog', text: 'Courses and programmes.', icon: 'grid' },
  { href: '/app/cohorts', label: 'Cohorts', text: 'Every scheduled intake.', icon: 'calendar' },
];
