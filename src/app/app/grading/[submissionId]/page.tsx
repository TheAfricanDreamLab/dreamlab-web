import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GradeForm } from '@/components/grading/grade-form';
import { RichText } from '@/components/learning/rich-text';
import { BackLink } from '@/components/ui/nav';
import { Badge, Card, Eyebrow, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { FileList } from '@/components/learning/file-list';
import { GRADING_STATUS_LABELS, GRADING_STATUS_TONES, levelLabel, type SubmissionForGrading, webLink } from '@/lib/grading';
import { dateTime, isUuid, wordCount } from '@/lib/learning';

export const metadata: Metadata = { title: 'Grade a submission' };

type Props = { params: Promise<{ submissionId: string }> };

export default async function GradeSubmissionPage({ params }: Props) {
  const { submissionId } = await params;
  if (!isUuid(submissionId)) notFound();
  const res = await api<SubmissionForGrading>('GET', `/v1/learning/grading/submissions/${submissionId}`);
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) return <Notice tone="error">{friendlyError(res.error)}</Notice>;
  const s = res.data;
  const newest = Math.max(...s.versions.map((v) => v.version));
  const link = webLink(s.link);

  return (
    <div className="space-y-6">
      <BackLink href="/app/grading" label="Grading queue" />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Eyebrow tone="gold">
            {s.course.title}
            {s.cohortName && ` · ${s.cohortName}`}
          </Eyebrow>
          <h1 className="text-[28px] font-extrabold">{s.item.title}</h1>
          <p className="text-[14px] text-muted">
            {s.learner.name} · version {s.version} · submitted {dateTime(s.submittedAt)}
            {s.item.gradeWeight > 0 && ` · ${s.item.gradeWeight}% of the course grade`}
          </p>
        </div>
        <Badge tone={GRADING_STATUS_TONES[s.status]}>{GRADING_STATUS_LABELS[s.status]}</Badge>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="space-y-3" aria-labelledby="work">
            <h2 id="work" className="text-[19px] font-bold">
              The learner’s work
              {s.item.practicalOutput && <span className="ml-2 text-[14px] font-normal text-muted">{s.item.practicalOutput}</span>}
            </h2>
            <Card className="space-y-3 p-5">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-body">{s.text}</p>
              <p className="text-[12.5px] text-muted">{wordCount(s.text)} words</p>
              {link && (
                <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[14px] font-semibold text-link hover:underline">
                  {link}
                </a>
              )}
              <FileList files={s.files ?? []} />
            </Card>
          </section>

          <details className="group rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line">
            <summary className="cursor-pointer text-[16px] font-bold text-ink">The brief</summary>
            <div className="mt-3 space-y-3">
              <RichText text={s.item.brief} />
              <ol className="list-decimal space-y-1 pl-5 text-[14px] text-body">
                {s.item.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </details>

          {s.versions.length > 1 && (
            <section className="space-y-2" aria-labelledby="versions">
              <h2 id="versions" className="text-[16px] font-bold">
                Versions
              </h2>
              <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-card ring-1 ring-line">
                {s.versions.map((v) => (
                  <li key={v.submissionId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[14px]">
                    {v.submissionId === s.submissionId ? (
                      <span className="font-semibold text-ink">Version {v.version} (this one)</span>
                    ) : (
                      <Link href={`/app/grading/${v.submissionId}`} className="font-semibold text-link hover:underline">
                        Version {v.version}
                      </Link>
                    )}
                    <span className="flex items-center gap-2 text-muted">
                      {dateTime(v.submittedAt)}
                      {v.scorePct !== null && <span className="font-mono">{v.scorePct}%</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="space-y-3" aria-labelledby="grade">
          <h2 id="grade" className="text-[19px] font-bold">
            Grade
          </h2>
          <Card className="p-5">
            <GradeForm
              key={s.submissionId}
              submissionId={s.submissionId}
              rubric={s.item.rubric}
              initial={s.grade ? { rubricScores: s.grade.rubricScores, feedback: s.grade.feedback } : null}
              selfAssessment={s.selfAssessment}
              disabled={s.version < newest ? `The learner has submitted version ${newest}. Grade that one.` : undefined}
            />
          </Card>
          {s.history.length > 0 && (
            <details className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
              <summary className="cursor-pointer text-[14px] font-semibold text-ink">Earlier grades ({s.history.length})</summary>
              <ul className="mt-2 space-y-2 text-[13.5px] text-body">
                {s.history.map((g) => (
                  <li key={g.id}>
                    {g.scorePct}% · {g.releasedAt ? 'released' : 'draft'} · {g.graderName ?? 'Faculty'} · {dateTime(g.createdAt)}
                    <span className="block text-[12.5px] text-muted">
                      {s.item.rubric.map((r) => `${r.criterion}: ${levelLabel(g.rubricScores[r.id])}`).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
