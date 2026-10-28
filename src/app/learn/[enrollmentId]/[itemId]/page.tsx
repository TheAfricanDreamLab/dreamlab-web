import type { CourseProgress, ItemView } from '@dreamlab/contracts';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { AssignmentForm } from '@/components/learning/assignment-form';
import { FileList } from '@/components/learning/file-list';
import { GradeSummary } from '@/components/learning/grade-summary';
import { ItemIcon, ProgressBar, StatusTick } from '@/components/learning/course-ui';
import { DiscussionPostForm, ReplyForm } from '@/components/learning/discussion-forms';
import { LessonPlayer } from '@/components/learning/lesson-player';
import { QuizPlayer } from '@/components/learning/quiz-player';
import { RichText } from '@/components/learning/rich-text';
import { Breadcrumbs } from '@/components/ui/nav';
import { Badge, ButtonLink, cx, Eyebrow, LogoMark, Notice } from '@/components/ui/primitives';
import { friendlyError } from '@/lib/errors';
import { api } from '@/lib/gateway';
import { dateTime, isUuid, ITEM_LABELS } from '@/lib/learning';
import { webLink } from '@/lib/grading';

type Params = { params: Promise<{ enrollmentId: string; itemId: string }> };

const loadItem = cache((enrollmentId: string, itemId: string) => api<ItemView>('GET', `/v1/learning/enrollments/${enrollmentId}/items/${itemId}`));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { enrollmentId, itemId } = await params;
  if (!isUuid(enrollmentId) || !isUuid(itemId)) return { title: 'Learning' };
  const res = await loadItem(enrollmentId, itemId);
  return { title: res.ok ? `${res.data.item.title} · ${res.data.course.title}` : 'Learning' };
}

export default async function PlayerPage({ params }: Params) {
  const { enrollmentId, itemId } = await params;
  if (!isUuid(enrollmentId) || !isUuid(itemId)) notFound();
  const res = await loadItem(enrollmentId, itemId);
  if (!res.ok) {
    if (res.status === 401) redirect(`/login?next=${encodeURIComponent(`/learn/${enrollmentId}/${itemId}`)}`);
    return (
      <main className="mx-auto max-w-[680px] space-y-4 px-4 py-16">
        <Notice tone="error">{friendlyError(res.error)}</Notice>
        <Link href={`/learn/${enrollmentId}`} className="text-[14px] font-semibold text-link hover:underline">
          ← Back to the course home
        </Link>
      </main>
    );
  }
  const view = res.data;
  const outline = await api<CourseProgress>('GET', `/v1/learning/courses/${view.course.slug}`);
  const { enrollment, course, module, item, content, previous, next } = view;
  const href = (id: string) => `/learn/${enrollmentId}/${id}`;
  const modules = outline.ok ? outline.data.course.modules : [];
  const moduleNo = modules.findIndex((m) => m.id === module.id) + 1 || module.position;
  const itemNo = (modules.find((m) => m.id === module.id)?.items.findIndex((i) => i.id === item.id) ?? -1) + 1 || item.position;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <Link href={`/learn/${enrollmentId}`} className="flex min-w-0 items-center gap-2.5 rounded-lg pr-2 hover:bg-surface" aria-label={`Back to the course home of ${course.title}`}>
            <LogoMark size={36} />
            <span className="min-w-0">
              <span className="block truncate font-display text-[14px] font-bold text-ink">{course.title}</span>
              <span className="block text-[11.5px] text-muted">
                <span aria-hidden>←</span> Course home
              </span>
            </span>
          </Link>
          <div className="ml-auto flex w-[4.5rem] shrink-0 items-center gap-1.5 sm:w-44 sm:gap-2">
            <ProgressBar pct={enrollment.progressPct} label={`Course progress: ${enrollment.progressPct}%`} />
            <span className="font-mono text-[11px] text-muted">{enrollment.progressPct}%</span>
          </div>
          <Link
            href={`/learn/${enrollmentId}`}
            aria-label="Exit to course home"
            data-nav="exit"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-card px-3 text-[13px] font-semibold text-ink ring-1 ring-line-strong hover:ring-line-heavy"
          >
            <span aria-hidden className="text-[17px] leading-none">
              ×
            </span>
            <span className="hidden sm:inline">Exit</span>
          </Link>
        </div>
        {outline.ok && (
          <details className="group mx-auto max-w-5xl px-4 pb-2">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-1 text-[13.5px] font-semibold text-link hover:bg-success-tint">
              <span aria-hidden className="transition-transform group-open:rotate-90">
                ▸
              </span>
              Course outline
              <span className="font-normal text-muted">
                · Module {moduleNo}, item {itemNo} of {module.itemCount}
              </span>
            </summary>
            <nav aria-label="Course outline" className="mt-2 max-h-[65vh] space-y-4 overflow-y-auto rounded-[var(--radius-card)] bg-card p-4 shadow-[var(--shadow-panel)] ring-1 ring-line">
              <Link href={`/learn/${enrollmentId}`} className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-[14px] font-semibold text-link hover:bg-success-tint">
                <span aria-hidden>⌂</span> Course home
              </Link>
              {outline.data.course.modules.map((m, mi) => (
                <div key={m.id} className="space-y-1">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">
                    Module {mi + 1} · {m.title}
                  </p>
                  <ol>
                    {m.items.map((i) => (
                      <li key={i.id}>
                        <Link
                          href={href(i.id)}
                          aria-current={i.id === item.id ? 'page' : undefined}
                          className={cx('flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-[14px]', i.id === item.id ? 'bg-success-tint font-semibold text-ink' : 'text-body hover:bg-surface')}
                        >
                          <StatusTick status={outline.data.itemStatus[i.id]} />
                          <ItemIcon type={i.type} className="text-muted" />
                          <span className="min-w-0 flex-1 truncate">{i.title}</span>
                          <span className="shrink-0 font-mono text-[11px] text-faint">{i.minutes}m</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </nav>
          </details>
        )}
      </header>

      <main className="mx-auto max-w-[680px] space-y-6 px-4 pb-16 pt-6">
        <header className="space-y-2">
          <Breadcrumbs
            items={[
              { label: course.title, href: `/learn/${enrollmentId}` },
              { label: `Module ${moduleNo}`, href: `/learn/${enrollmentId}` },
              { label: item.title },
            ]}
          />
          <Eyebrow tone="green">
            {module.title} · {ITEM_LABELS[item.type]} · {item.minutes} min
          </Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">{item.title}</h1>
            {view.status === 'completed' && <Badge tone="green">Done</Badge>}
            {!item.required && <Badge>Optional</Badge>}
          </div>
        </header>

        {content.type === 'lesson' && (
          <LessonPlayer
            key={itemId}
            enrollmentId={enrollmentId}
            itemId={itemId}
            courseSlug={course.slug}
            title={item.title}
            minutes={item.minutes}
            steps={content.steps}
            initial={view.state}
            completed={view.status === 'completed'}
            next={next}
          />
        )}

        {content.type === 'quiz' && <QuizPlayer key={itemId} enrollmentId={enrollmentId} itemId={itemId} quiz={content} attempts={view.quizAttempts} next={next} />}

        {content.type === 'assignment' && (
          <div className="space-y-6">
            <section className="space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line sm:p-6">
              {content.practicalOutput && (
                <p className="inline-flex items-center gap-2 rounded-full bg-gold-tint px-3 py-1 text-[12.5px] font-semibold text-gold-ink ring-1 ring-gold-line">
                  <span aria-hidden>◆</span> Practical output: {content.practicalOutput}
                </p>
              )}
              <RichText text={content.brief} />
            </section>
            <section className="space-y-3" aria-labelledby="steps">
              <h2 id="steps" className="text-[19px] font-bold">
                Steps
              </h2>
              <ol className="space-y-2">
                {content.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 rounded-[var(--radius-field)] bg-card px-4 py-3 ring-1 ring-line">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary font-display text-[13px] font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5 text-[14.5px] leading-relaxed text-body">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
            {(() => {
              const latest = [...view.submissions].sort((a, b) => b.version - a.version)[0];
              const graded = [...view.submissions].sort((a, b) => b.version - a.version).find((s) => s.grade);
              return (
                <>
                  {latest && !latest.grade && <Notice tone="success">Submitted · version {latest.version} · awaiting faculty review</Notice>}
                  {graded?.grade && <GradeSummary grade={graded.grade} version={graded.version} rubric={content.rubric} />}
                </>
              );
            })()}
            <AssignmentForm
              key={itemId}
              enrollmentId={enrollmentId}
              itemId={itemId}
              assignment={content}
              previous={(() => {
                const latest = [...view.submissions].sort((a, b) => b.version - a.version)[0];
                return latest ? { text: latest.text, link: latest.link, selfAssessment: latest.selfAssessment, version: latest.version } : null;
              })()}
            />
            {view.submissions.length > 0 && (
              <section className="space-y-2" aria-labelledby="versions">
                <h2 id="versions" className="text-[16px] font-bold">
                  Your versions
                </h2>
                <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-card ring-1 ring-line">
                  {[...view.submissions]
                    .sort((a, b) => b.version - a.version)
                    .map((s) => (
                      <li key={s.id}>
                        <details className="group px-4 py-3">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px]">
                            <span className="font-semibold text-ink">Version {s.version}</span>
                            <span className="text-muted">{dateTime(s.submittedAt)}</span>
                            {s.grade ? <Badge tone="green">Graded · {s.grade.scorePct}%</Badge> : <Badge tone="gold">Awaiting review</Badge>}
                          </summary>
                          <div className="mt-3 space-y-2">
                            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-body">{s.text}</p>
                            {webLink(s.link) && (
                              <a href={webLink(s.link)!} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[13.5px] font-semibold text-link hover:underline">
                                {s.link}
                              </a>
                            )}
                            <FileList files={s.files ?? []} />
                          </div>
                        </details>
                      </li>
                    ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {content.type === 'discussion' && (
          <div className="space-y-6">
            <section className="space-y-3 rounded-[var(--radius-card)] bg-forest p-5 text-white sm:p-6">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-gold">Discuss</p>
              <RichText text={content.prompt} className="text-white/90 [&_strong]:text-white" />
              {content.guidance && <p className="text-[13.5px] leading-relaxed text-white/70">{content.guidance}</p>}
            </section>
            {!view.discussion?.hasPosted ? (
              <DiscussionPostForm key={itemId} enrollmentId={enrollmentId} itemId={itemId} minWords={content.minWords ?? 0} peers={view.discussion?.postCount ?? 0} />
            ) : (
              <section className="space-y-3" aria-labelledby="posts">
                <h2 id="posts" className="text-[19px] font-bold">
                  {view.discussion.postCount === 1 ? '1 response' : `${view.discussion.postCount} responses`}
                </h2>
                <ul className="space-y-3">
                  {view.discussion.posts.map((p) => (
                    <li key={p.id} className="space-y-3 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line sm:p-5">
                      <PostHead name={p.author.name} initials={p.author.initials} isMe={p.author.isMe} at={p.createdAt} />
                      <p className="whitespace-pre-wrap text-[14.5px] leading-relaxed text-body">{p.body}</p>
                      {p.replies.length > 0 && (
                        <ul className="space-y-3 border-l-2 border-line pl-4">
                          {p.replies.map((r) => (
                            <li key={r.id} className="space-y-1.5">
                              <PostHead name={r.author.name} initials={r.author.initials} isMe={r.author.isMe} at={r.createdAt} small />
                              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-body">{r.body}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <ReplyForm enrollmentId={enrollmentId} itemId={itemId} parentId={p.id} name={p.author.isMe ? 'yourself' : p.author.name.split(' ')[0]!} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <nav className="grid grid-cols-2 gap-3 border-t border-line pt-6 [&>*]:min-w-0" aria-label="Previous and next">
          {previous ? (
            <Link href={href(previous.id)} className="group rounded-[var(--radius-field)] bg-card p-3 ring-1 ring-line hover:ring-line-heavy">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">← Previous</span>
              <span className="block truncate text-[13.5px] font-semibold text-ink">{previous.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={href(next.id)} className="rounded-[var(--radius-field)] bg-card p-3 text-right ring-1 ring-line hover:ring-line-heavy">
              <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Next →</span>
              <span className="block truncate text-[13.5px] font-semibold text-ink">{next.title}</span>
            </Link>
          ) : (
            <ButtonLink href={`/learn/${enrollmentId}`} variant="secondary" className="h-auto py-3 text-[13.5px]">
              Back to course home
            </ButtonLink>
          )}
        </nav>
      </main>
    </div>
  );
}

function PostHead({ name, initials, isMe, at, small }: { name: string; initials: string; isMe: boolean; at: string; small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className={cx('grid shrink-0 place-items-center rounded-full font-display font-bold ring-1', small ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-[13px]', isMe ? 'bg-gold-tint text-gold-ink ring-gold-line' : 'bg-success-tint text-link ring-success-line')}
      >
        {initials}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">
          {name}
          {isMe && <span className="ml-1.5 font-normal text-muted">(you)</span>}
        </span>
        <span className="block text-[11.5px] text-muted">{dateTime(at)}</span>
      </span>
    </div>
  );
}
