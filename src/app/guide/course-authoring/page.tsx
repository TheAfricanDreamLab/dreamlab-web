import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageChrome } from '@/components/site/page-chrome';
import { Breadcrumbs } from '@/components/ui/nav';
import { Eyebrow } from '@/components/ui/primitives';
import chapterLengths from '../../../../public/guides/course-authoring/chapters.json';

export const metadata: Metadata = {
  title: 'How to create a course',
  description: 'Watch or read: setting up a course, writing lessons, videos and captions, quizzes, previews, reviewing and publishing on The African Dream Lab.',
};

/*
 * The course-authoring guide: each chapter as a short narrated video (made from the app itself with
 * scripts/guide) and as written steps, for people who prefer to read. Public, so anyone deciding to
 * teach can look first.
 */

const BASE = '/guides/course-authoring';
const lengths = new Map((chapterLengths as { id: string; seconds: number }[]).map((c) => [c.id, c.seconds]));
const clock = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');

type Chapter = { id: string; title: string; summary: string; steps: ReactNode[]; tips?: ReactNode[] };

const CHAPTERS: Chapter[] = [
  {
    id: 'start',
    title: 'Start a course',
    summary: 'Create a course and answer four short questions to set it up.',
    steps: [
      <>Open <b>Authoring</b> from the main menu. You need the course author role in your organisation; an admin can give it to you under People.</>,
      <>Type a clear title. The web address is filled in from it; you can change it now, but not after the course is published.</>,
      <>Choose <b>Start writing</b>. A new course opens on four short steps: <b>The basics</b> (subtitle, description, level), <b>Who it’s for</b> (audience and outcomes), <b>Cover</b> (a photo, optional) and <b>First module</b>.</>,
      <>Choose <b>Start writing</b> again to reach the workspace. Every answer can be changed later in <b>Course details</b>. <b>Skip setup</b> goes straight to the workspace.</>,
    ],
    tips: [<>Write outcomes as things learners will be able to <i>do</i>: “Test a solution with five people”, not “Understand testing”. Three to five is plenty.</>],
  },
  {
    id: 'workspace',
    title: 'Find your way around the workspace',
    summary: 'The outline, the editor and the live preview; saving, undo and version history.',
    steps: [
      <>The <b>outline</b> on the left shows every module and item. Choose one to edit it in the middle. On a phone, the outline opens from the <b>Outline</b> button.</>,
      <><b>Add module</b> at the bottom of the outline adds a module. Each module’s <b>⋯</b> menu adds a lesson, quiz, assignment or discussion, and can duplicate or remove it.</>,
      <>Drag anything in the outline by its handle to reorder it, including moving a lesson into another module. Each item’s <b>⋯</b> menu also has <b>Move to module</b>.</>,
      <><b>Preview</b> shows the selected lesson as learners will see it, on a laptop or a phone, and changes as you type.</>,
      <>Your work saves itself a moment after you stop; the top bar says “Saved just now”. <b>Ctrl+S</b> saves straight away. <b>Undo</b> and <b>Redo</b> (Ctrl+Z, Ctrl+Shift+Z) cover the whole course. <b>History</b> lists earlier versions; <b>Restore</b> brings one back and keeps what it replaced.</>,
    ],
    tips: [<>If two people change the same course at once, the second to save is asked to reload, so nothing is overwritten silently.</>],
  },
  {
    id: 'writing',
    title: 'Write lessons with blocks',
    summary: 'Text that looks the way learners see it, teaching blocks, and questions with feedback.',
    steps: [
      <>A lesson is a few short <b>steps</b>; learners see one at a time. Each step is a column of <b>blocks</b>.</>,
      <><b>Text</b> blocks work like a document: headings, bold, italic, underline, links, lists, quotes, code and tables. Type <b>/</b> on an empty line for the menu. Pasting from Word or Google Docs keeps headings, lists, links and tables.</>,
      <><b>+ Add block</b> opens the picker: teaching blocks (callout, example, quote, key terms, think-then-reveal, framework), media (image, video, download) and activities (multiple choice, put in order, match pairs, poll, rating scale, reflection, scenario).</>,
      <>For questions, mark the right answer, give feedback on each option, and write an explanation. Learners get two tries before the answer is shown.</>,
      <>A block that is missing something says so at once, in red. Drag blocks by their handle, or use each block’s <b>⋯</b> menu to move, insert, copy or remove it.</>,
    ],
    tips: [
      <>Keep steps short: one idea, then something to do. A step with more than about eight blocks is a lot on a phone screen.</>,
      <>Use a reflection after an idea learners should apply to their own life or work; their answers are kept in their journal.</>,
    ],
  },
  {
    id: 'videos',
    title: 'Add videos, captions and questions',
    summary: 'Upload to the video library, add captions, chapters and questions that pause the video.',
    steps: [
      <>Open <Link href="/app/authoring/videos" className="font-semibold text-link hover:underline">Video library</Link> from Authoring and drop in MP4, MOV, WebM or MKV files (up to 2 GB each). Uploads carry on while you work and after a dropped connection.</>,
      <>Each video is prepared for streaming at 360p and 720p, so learners on slow connections can watch. The library shows its progress, then <b>Ready</b>.</>,
      <>Open a video to add <b>captions</b>: upload a .vtt or .srt file, choose <b>Make</b> to have them made automatically (check them afterwards), or write them line by line in the caption editor.</>,
      <>In a lesson, add a <b>Video</b> block and <b>Choose from the library</b>, or upload straight from the block. For YouTube or Vimeo, paste the link; the title and maker are filled in.</>,
      <>Add <b>chapters</b> so learners can jump to each part, and <b>questions during the video</b>: at the time you choose, the video pauses and asks one of the step’s question blocks. Learners can also answer it below the video.</>,
    ],
    tips: [<>Short videos (under six minutes) with a question or reflection after them hold attention far better than long ones.</>, <>Always add captions: many learners watch without sound, and captions give them a transcript to search.</>],
  },
  {
    id: 'assess',
    title: 'Quizzes, assignments, previews and downloads',
    summary: 'Graded quizzes, a practical assignment with a rubric, a free preview and files to download.',
    steps: [
      <>A <b>quiz</b> has an introduction, a pass mark, a number of attempts (or unlimited) and multiple choice, ordering or matching questions. Its grade weight counts towards the course grade.</>,
      <>An <b>assignment</b> asks learners to make something real: a brief, numbered steps, a rubric that faculty score from 0 to 4 per criterion, an optional starting template, and a minimum length.</>,
      <>A <b>discussion</b> asks a question; learners post their answer and read their peers’.</>,
      <>Tick <b>Free preview</b> on an item to let anyone open it from the course page before enrolling. It shows as “Free” in the outline.</>,
      <>Add a <b>Download</b> block for worksheets, slides or readings (PDF, Word, PowerPoint, Excel, ZIP and more, up to 50 MB).</>,
    ],
    tips: [<>Make the first lesson your free preview: it is how most people decide to enrol.</>],
  },
  {
    id: 'publish',
    title: 'Review together and publish',
    summary: 'The Ready to publish checklist, comments from reviewers, and publishing a new version.',
    steps: [
      <><b>Ready to publish</b> in the outline lists anything that stops the course going for review, in plain words; choose a line to go straight to it. Suggestions below it are optional improvements.</>,
      <>Reviewers comment on exactly what learners will see: in <b>Preview</b>, hover a block and choose <b>Comment</b>. Authors can also comment from a block’s menu. Reply, resolve and reopen threads in the <b>Comments</b> panel; everyone involved is notified.</>,
      <>When others have the course open, their initials show in the top bar and on the lesson they are in.</>,
      <>Choose <b>Send for review</b>. A reviewer (with the right to publish) reads it and either asks for changes, with a note, or publishes it. Courses for the public catalogue are reviewed by the platform team.</>,
      <>Publishing makes a new version. Learners already enrolled keep the version they started; new learners get the new one. To change a published course, choose <b>Edit</b> in Authoring to start a new draft.</>,
    ],
  },
];

const TIPS = [
  ['Start from what learners will do', 'Write the outcomes first, then build each module towards one of them.'],
  ['Little and often', 'Ten to twenty minutes per lesson, two to four steps, one idea per step.'],
  ['Make them do something every few minutes', 'A question, a poll, a reflection or a scenario after each idea keeps learners thinking, not just reading.'],
  ['Use their world', 'Examples from African towns, markets and businesses make ideas land. Name the place and the people.'],
  ['End with something real', 'An assignment that produces a usable artefact (a plan, a canvas, a pitch) is what learners remember and show others.'],
  ['Credit your sources', 'If a lesson builds on someone else’s talk, book or video, say so in the lesson and the course description.'],
];

const FAQ: [string, ReactNode][] = [
  ['Who can write courses?', <>People with the <b>course author</b> role in an organisation, for all its courses or just one. Organisation admins give the role under People.</>],
  ['Who publishes them?', <>Anyone with the right to publish courses in the organisation (reviewers). Courses for the public catalogue are reviewed by The African Dream Lab team.</>],
  ['Can I work on a course with others?', <>Yes. Several authors can open it at once; you see who is there, and comments keep feedback next to the content it is about.</>],
  ['What happens to learners when I change a course?', <>Nothing until you publish. After publishing, learners already enrolled stay on their version; new learners get the new one.</>],
  ['Can I import a course I wrote elsewhere?', <>In the workspace, <b>⋯ → Advanced: JSON</b> can import and export a whole course as a file.</>],
];

export default function CourseAuthoringGuide() {
  return (
    <PageChrome next="/guide/course-authoring">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs items={[{ label: 'Guides' }, { label: 'Creating a course' }]} />
        <header className="mt-4 max-w-3xl space-y-3">
          <Eyebrow tone="gold">Guide for course authors</Eyebrow>
          <h1 className="text-[34px] font-extrabold leading-tight sm:text-[40px]">How to create a course</h1>
          <p className="text-[16px] leading-relaxed text-body">
            From the first idea to publishing, in six short chapters. Watch each one (about two minutes, with captions), or read the steps below it. Ready to start?{' '}
            <Link href="/app/authoring" className="font-semibold text-link hover:underline">
              Open Authoring
            </Link>
            .
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <nav aria-label="Chapters" className="lg:sticky lg:top-24 lg:self-start">
            <ol className="space-y-1 text-[14px]">
              {CHAPTERS.map((c, i) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-body hover:bg-surface hover:text-ink">
                    <span className="font-mono text-[11px] text-muted">{i + 1}</span>
                    <span className="min-w-0 flex-1">{c.title}</span>
                    <span className="font-mono text-[11px] text-faint">{clock(lengths.get(c.id))}</span>
                  </a>
                </li>
              ))}
              <li>
                <a href="#tips" className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-body hover:bg-surface hover:text-ink">
                  <span className="font-mono text-[11px] text-muted">★</span> Tips for an engaging course
                </a>
              </li>
              <li>
                <a href="#questions" className="flex items-baseline gap-2 rounded-lg px-2 py-1.5 text-body hover:bg-surface hover:text-ink">
                  <span className="font-mono text-[11px] text-muted">?</span> Common questions
                </a>
              </li>
            </ol>
          </nav>

          <div className="min-w-0 space-y-14">
            {CHAPTERS.map((c, i) => (
              <section key={c.id} id={c.id} aria-labelledby={`${c.id}-title`} className="scroll-mt-24 space-y-5">
                <header className="space-y-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">
                    Chapter {i + 1}
                    {lengths.get(c.id) ? ` · ${clock(lengths.get(c.id))} video` : ''}
                  </p>
                  <h2 id={`${c.id}-title`} className="text-[26px] font-extrabold leading-tight">
                    {c.title}
                  </h2>
                  <p className="text-[15px] text-muted">{c.summary}</p>
                </header>
                {lengths.has(c.id) && (
                  <video controls preload="none" playsInline poster={`${BASE}/${c.id}.jpg`} aria-label={`Video: ${c.title}`} className="aspect-video w-full rounded-[var(--radius-card)] bg-forest ring-1 ring-line">
                    <source src={`${BASE}/${c.id}.mp4`} type="video/mp4" />
                    <track kind="captions" src={`${BASE}/${c.id}.vtt`} srcLang="en" label="English" default />
                  </video>
                )}
                <div className="rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-line sm:p-6">
                  <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted">Read it</p>
                  <ol className="space-y-3">
                    {c.steps.map((s, k) => (
                      <li key={k} className="flex gap-3 text-[15px] leading-relaxed text-body">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest font-mono text-[11px] font-bold text-white">{k + 1}</span>
                        <span className="min-w-0">{s}</span>
                      </li>
                    ))}
                  </ol>
                  {c.tips && (
                    <div className="mt-5 space-y-2 rounded-lg bg-gold-tint p-4 ring-1 ring-gold-line">
                      <p className="text-[13px] font-bold text-gold-ink">Tip</p>
                      {c.tips.map((t, k) => (
                        <p key={k} className="text-[14px] leading-relaxed text-body">
                          {t}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}

            <section id="tips" aria-labelledby="tips-title" className="scroll-mt-24 space-y-4">
              <h2 id="tips-title" className="text-[26px] font-extrabold">
                Tips for an engaging course
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {TIPS.map(([title, body]) => (
                  <li key={title} className="space-y-1 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-line">
                    <p className="font-display text-[16px] font-bold text-ink">{title}</p>
                    <p className="text-[14px] leading-relaxed text-body">{body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="questions" aria-labelledby="questions-title" className="scroll-mt-24 space-y-3">
              <h2 id="questions-title" className="text-[26px] font-extrabold">
                Common questions
              </h2>
              <div className="divide-y divide-line rounded-[var(--radius-card)] bg-card ring-1 ring-line">
                {FAQ.map(([q, a]) => (
                  <details key={q} className="group p-4">
                    <summary className="cursor-pointer list-none font-semibold text-ink">
                      <span aria-hidden className="mr-2 inline-block text-muted transition-transform group-open:rotate-90">
                        ▶
                      </span>
                      {q}
                    </summary>
                    <p className="mt-2 pl-6 text-[14.5px] leading-relaxed text-body">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageChrome>
  );
}
