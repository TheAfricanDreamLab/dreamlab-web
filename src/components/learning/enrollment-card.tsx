import type { EnrollmentSummary } from '@dreamlab/contracts';
import Link from 'next/link';
import { Badge, Card } from '@/components/ui/primitives';
import { ITEM_LABELS, shortDate } from '@/lib/learning';
import { CourseCover, ItemIcon, ProgressBar } from './course-ui';

/** A course I'm taking: progress, and "Continue" to the next item. */
export function EnrollmentCard({ e, compact = false }: { e: EnrollmentSummary; compact?: boolean }) {
  const completed = e.status === 'completed';
  return (
    <Card className="flex overflow-hidden">
      <CourseCover cover={e.course.cover} className="w-20 shrink-0 sm:w-28" symbolSize={compact ? 26 : 34} />
      <div className="min-w-0 flex-1 space-y-3 p-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16.5px] font-bold">
              <Link href={`/learn/${e.id}`} className="hover:underline">
                {e.course.title}
              </Link>
            </h3>
            {completed && <Badge tone="green">Completed</Badge>}
          </div>
          <p className="text-[12.5px] text-muted">
            {e.course.provider} · {completed && e.completedAt ? `finished ${shortDate(e.completedAt)}` : `last active ${shortDate(e.lastActiveAt)}`}
          </p>
        </div>
        <div className="space-y-1.5">
          <ProgressBar pct={e.progressPct} label={`${e.course.title}: ${e.progressPct}% done`} />
          <p className="font-mono text-[11px] text-muted">
            {e.completedItems} of {e.totalItems} done · {e.progressPct}%
          </p>
        </div>
        {e.nextItem && !compact && (
          <p className="flex items-center gap-2 text-[13px] text-body">
            <ItemIcon type={e.nextItem.type} className="text-link" />
            <span className="truncate">
              Next: <span className="font-semibold text-ink">{e.nextItem.title}</span> · {ITEM_LABELS[e.nextItem.type]}
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {e.nextItem && (
            <Link
              href={`/learn/${e.id}/${e.nextItem.id}`}
              className="inline-flex h-10 items-center rounded-[var(--radius-field)] bg-primary px-4 text-[14px] font-semibold text-white hover:bg-primary-hover"
              aria-label={`Continue ${e.course.title}`}
            >
              Continue <span aria-hidden className="ml-1.5">→</span>
            </Link>
          )}
          <Link href={`/learn/${e.id}`} className="inline-flex h-10 items-center text-[14px] font-semibold text-link hover:underline" aria-label={`Course home: ${e.course.title}`}>
            Course home
          </Link>
        </div>
      </div>
    </Card>
  );
}
