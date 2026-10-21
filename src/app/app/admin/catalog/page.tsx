import type { Metadata } from 'next';
import Link from 'next/link';
import { setCourseFlag } from '@/app/actions/platform';
import { ImportForm } from '@/components/admin/admin-forms';
import { Badge, Card, cx, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError, messageForCode } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { type AdminCourse, shortDate } from '@/lib/learning';

export const metadata: Metadata = { title: 'Catalog' };

function Toggle({ course, flag, on, label }: { course: AdminCourse; flag: 'listed' | 'featured'; on: boolean; label: string }) {
  return (
    <form action={setCourseFlag}>
      <input type="hidden" name="courseId" value={course.id} />
      <input type="hidden" name="flag" value={flag} />
      <input type="hidden" name="value" value={String(!on)} />
      <button
        type="submit"
        aria-pressed={on}
        aria-label={`${label}: ${course.title}`}
        className="group inline-flex min-h-11 items-center gap-2 rounded-full pr-1 text-[13px] font-semibold text-body"
      >
        <span className={cx('relative inline-block h-6 w-11 rounded-full transition-colors', on ? 'bg-primary' : 'bg-line-heavy')}>
          <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]', on ? 'left-[22px]' : 'left-0.5')} />
        </span>
        <span className="w-6 text-left">{on ? 'On' : 'Off'}</span>
      </button>
    </form>
  );
}

export default async function CatalogAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const res = await api<{ items: AdminCourse[] }>('GET', '/v1/catalog/admin/courses');
  const { error } = await searchParams;
  const flagError =
    error === 'flag_invalid' || error === 'flag_update_failed' ? 'That change didn’t save. Please try again.' : messageForCode(error);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Eyebrow tone="gold">Platform admin</Eyebrow>
        <h1 className="text-[30px] font-extrabold">Catalog</h1>
        <p className="text-[14.5px] text-muted">Every course on the platform. Hidden courses leave the catalogue but stay open to learners already enrolled.</p>
      </header>

      {flagError && <Notice tone="error">{flagError}</Notice>}

      {!res.ok ? (
        <Notice tone="error">{friendlyError(res.error)}</Notice>
      ) : res.data.items.length === 0 ? (
        <Card className="p-10 text-center text-[14.5px] text-muted">No courses yet. Import one below.</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="stack-table w-full text-left text-[14px]">
            <thead className="bg-surface font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th scope="col" className="px-5 py-3">
                  Course
                </th>
                <th scope="col" className="px-5 py-3">
                  State
                </th>
                <th scope="col" className="px-5 py-3">
                  Version
                </th>
                <th scope="col" className="px-5 py-3">
                  Listed
                </th>
                <th scope="col" className="px-5 py-3">
                  Featured
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {res.data.items.map((c) => (
                <tr key={c.id} data-course={c.slug}>
                  <td className="px-5 py-3">
                    <Link href={`/courses/${c.slug}`} className="font-semibold text-ink hover:underline">
                      {c.title}
                    </Link>
                    <span className="block break-all text-[13px] text-muted">
                      {c.provider} · <span className="font-mono">{c.slug}</span>
                    </span>
                  </td>
                  <td data-label="State" className="px-5 py-3">
                    <span className="flex flex-wrap gap-1">
                      {c.availability === 'available' ? <Badge tone="green">Open</Badge> : <Badge tone="gold">Coming soon</Badge>}
                      {c.visibility !== 'public' && <Badge>{c.visibility === 'org_private' ? 'Organisation only' : 'Unlisted'}</Badge>}
                    </span>
                  </td>
                  <td data-label="Version" className="px-5 py-3 text-muted">
                    {c.versionNo ? `v${c.versionNo}` : '—'}
                    {c.publishedAt && <span className="block text-[12px]">{shortDate(c.publishedAt)}</span>}
                  </td>
                  <td data-label="Listed" className="px-5 py-3">
                    <Toggle course={c} flag="listed" on={c.listed} label="Listed" />
                  </td>
                  <td data-label="Featured" className="px-5 py-3">
                    <Toggle course={c} flag="featured" on={c.featured} label="Featured" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="max-w-2xl space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-[19px] font-bold">Import a course or programme</h2>
          <p className="text-[13.5px] text-muted">Upload an authored file. Importing the same slug again updates it.</p>
        </div>
        <ImportForm />
      </Card>
    </div>
  );
}
