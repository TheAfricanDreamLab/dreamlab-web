import { Badge, Card } from '@/components/ui/primitives';
import { levelLabel, RUBRIC_MAX_LEVEL, type ReleasedGrade } from '@/lib/grading';
import { dateTime } from '@/lib/learning';

/** Faculty's released grade on a submission: the score, each criterion's level, and their feedback. */
export function GradeSummary({ grade, version, rubric }: { grade: ReleasedGrade; version: number; rubric: { id: string; criterion: string }[] }) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Faculty grade · version {version}</p>
          <p className="font-display text-[32px] font-extrabold leading-none text-ink">{grade.scorePct}%</p>
        </div>
        <span className="text-[13px] text-muted">Released {dateTime(grade.releasedAt)}</span>
      </div>
      <ul className="divide-y divide-line">
        {rubric.map((r) => {
          const level = grade.rubricScores[r.id];
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="text-[14px] text-ink">{r.criterion}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-muted">
                  {level ?? '—'}/{RUBRIC_MAX_LEVEL}
                </span>
                <Badge tone={level !== undefined && level >= 3 ? 'green' : level !== undefined && level >= 2 ? 'gold' : 'neutral'}>{levelLabel(level)}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
      {grade.feedback && (
        <div className="space-y-1 rounded-[var(--radius-field)] bg-surface px-4 py-3 ring-1 ring-line">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">Feedback</p>
          <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-body">{grade.feedback}</p>
        </div>
      )}
    </Card>
  );
}
