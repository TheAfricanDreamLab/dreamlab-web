import type { Page } from '@playwright/test';

/*
 * The course-authoring guide's video chapters (/guide/course-authoring). Each step is a line of
 * narration and what happens on screen while it is spoken. `record.spec.ts` plays the steps against a
 * local stack and logs when each began; `narrate.py` voices the lines; `assemble.py` puts them together.
 * Change the words here and run `pnpm guide:videos` to make the videos again.
 */

export type Helpers = {
  /** Moves the visible cursor to the element, then clicks it. */
  click: (target: ReturnType<Page['locator']>) => Promise<void>;
  /** Types at a reading pace. */
  type: (target: ReturnType<Page['locator']>, text: string) => Promise<void>;
  /** Points at an element without clicking. */
  point: (target: ReturnType<Page['locator']>) => Promise<void>;
  pause: (ms: number) => Promise<void>;
  /** Shared between chapters: the course's workspace address, file paths. */
  state: { draftUrl?: string; videoFile: string; captionFile: string; worksheet: string; course: string };
};

export type Step = { say: string; act?: (page: Page, h: Helpers) => Promise<void> };
export type Chapter = { id: string; title: string; summary: string; steps: Step[] };

const outline = (p: Page) => p.getByRole('navigation', { name: 'Course outline' });

export const CHAPTERS: Chapter[] = [
  {
    id: 'start',
    title: 'Start a course',
    summary: 'Create a course and answer four short questions to set it up.',
    steps: [
      {
        say: 'Welcome. In this guide you will create a course on The African Dream Lab, from the first idea to publishing. Everything starts in Authoring.',
        act: async (p, h) => {
          await p.goto('/app/authoring');
          await h.point(p.getByRole('heading', { name: 'Authoring', level: 1 }));
        },
      },
      {
        say: 'Give the course a clear title. The web address is filled in for you. Then choose Start writing.',
        act: async (p, h) => {
          await h.type(p.getByLabel('Course title'), h.state.course);
          // Addresses are unique across the platform: each recording run gets its own.
          await p.getByLabel('Web address').fill(`solving-problems-${Date.now().toString(36)}`);
          await h.pause(600);
          await h.click(p.getByRole('button', { name: 'Start writing' }));
          await p.waitForURL(/\/app\/authoring\/[0-9a-f-]+$/);
          h.state.draftUrl = new URL(p.url()).pathname;
        },
      },
      {
        say: 'A new course begins with four short steps. First, the basics: a subtitle that sells it in one line, and a description of what the course is about.',
        act: async (p, h) => {
          await h.type(p.getByLabel('Subtitle', { exact: true }), 'Turn a problem you care about into a plan you can test');
          await h.type(p.getByRole('textbox', { name: 'Description', exact: true }), 'A practical course for young builders: name the problem, find its causes, and test a first solution with real people.');
          await h.click(p.getByRole('button', { name: 'Continue' }));
        },
      },
      {
        say: 'Next, who it is for, and what learners will be able to do by the end. Write each outcome on its own line, and aim for three or more.',
        act: async (p, h) => {
          await h.type(p.getByLabel('Who it is for'), 'Students and early founders');
          await h.type(p.getByLabel('What learners will be able to do'), 'Describe a problem in one sentence\nFind its root causes\nTest a solution with five people');
          await h.click(p.getByRole('button', { name: 'Continue' }));
        },
      },
      {
        say: 'You can add a cover photo now or later. Then name your first module and its first lesson, and choose Start writing. Every answer can be changed later in Course details.',
        act: async (p, h) => {
          await h.pause(1200);
          await h.click(p.getByRole('button', { name: 'Continue' }));
          await h.type(p.getByLabel('Module title'), 'Understanding the problem');
          await h.type(p.getByLabel('First lesson title'), 'What makes a good problem statement');
          await h.click(p.getByRole('button', { name: 'Start writing' }));
          await outline(p).waitFor();
        },
      },
    ],
  },
  {
    id: 'workspace',
    title: 'Find your way around the workspace',
    summary: 'The outline, the editor and the live preview; saving, undo and version history.',
    steps: [
      {
        say: 'This is your workspace. On the left is the outline of the whole course. In the middle is the part you are working on.',
        act: async (p, h) => {
          await h.point(outline(p));
          await h.pause(800);
          await h.point(p.locator('#workspace-main'));
        },
      },
      {
        say: 'Add a module with Add module. Each module has a menu for adding lessons, quizzes, assignments and discussions.',
        act: async (p, h) => {
          await h.click(outline(p).getByRole('button', { name: 'Add module' }));
          await h.pause(500);
          await h.click(outline(p).getByRole('button', { name: 'Module 2 actions' }));
          await h.pause(900);
          await h.click(p.getByRole('menuitem', { name: 'Add a lesson' }));
        },
      },
      {
        say: 'To reorder, drag anything in the outline by its handle: lessons within a module, into another module, or whole modules.',
        act: async (p, h) => {
          await h.point(outline(p).getByRole('button', { name: /First lesson/ }).first());
          await h.pause(600);
        },
      },
      {
        say: 'Choose Preview to see the lesson as learners will, on a laptop or a phone. It changes as you type.',
        act: async (p, h) => {
          await h.click(outline(p).getByRole('button', { name: /What makes a good problem statement/ }).first());
          await h.click(p.getByRole('button', { name: 'Preview', exact: true }));
          await h.pause(800);
          await h.click(p.getByRole('button', { name: 'Phone' }));
          await h.pause(900);
          await h.click(p.getByRole('button', { name: 'Laptop' }));
        },
      },
      {
        say: 'Your work saves itself a moment after you stop typing; the top bar says when. Control S saves straight away. History lists earlier versions, and any of them can be restored.',
        act: async (p, h) => {
          await h.click(p.getByRole('button', { name: 'Close the preview' }));
          await h.point(p.getByText(/Saved|Saving|Unsaved/).first());
          await p.keyboard.press('Control+s');
          await h.pause(800);
          await h.click(p.getByRole('button', { name: 'History' }));
          await h.pause(1500);
          await h.click(p.getByRole('button', { name: 'Close version history' }));
        },
      },
    ],
  },
  {
    id: 'writing',
    title: 'Write lessons with blocks',
    summary: 'Text that looks the way learners see it, teaching blocks, and questions with feedback.',
    steps: [
      {
        say: 'A lesson is a few short steps, and each step is a column of blocks. Text blocks work like a document: headings, bold, lists, links and tables.',
        act: async (p, h) => {
          await p.goto(h.state.draftUrl!);
          await h.click(outline(p).getByRole('button', { name: /What makes a good problem statement/ }).first());
          const text = p.getByRole('region', { name: 'Text block 1' });
          await h.click(text.getByRole('button', { name: /Write the first step here/ }));
          const body = text.getByRole('textbox', { name: 'Text', exact: true });
          await body.fill('');
          await h.type(body, 'A good problem statement names who has the problem and what it costs them.');
          await body.press('Control+a');
          await h.click(text.getByRole('button', { name: 'Bold (Ctrl+B)' }));
          await body.press('End');
        },
      },
      {
        say: 'Type a slash on an empty line for headings, lists, quotes, code and tables.',
        act: async (p, h) => {
          const body = p.getByRole('region', { name: 'Text block 1' }).getByRole('textbox', { name: 'Text', exact: true });
          await body.press('Enter');
          await h.type(body, '/');
          await h.pause(1200);
          await body.press('ArrowDown');
          await body.press('ArrowDown');
          await body.press('ArrowDown');
          await body.press('Enter');
          await h.type(body, 'Who has it\nWhat it costs them\nWhy it matters now');
        },
      },
      {
        say: 'Add more with Add block. Choose from teaching blocks, like callouts, examples and frameworks; media; and activities that check understanding.',
        act: async (p, h) => {
          await h.click(p.getByRole('button', { name: 'Add a block to step 1' }));
          await h.pause(1500);
          await h.click(p.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Callout/ }));
          const callout = p.getByRole('region', { name: 'Callout block 2' });
          await h.type(callout.getByLabel('Heading (optional)'), 'Keep it to one sentence');
          await h.type(callout.getByRole('textbox', { name: 'Text', exact: true }), 'If you need two sentences, you may have two problems.');
        },
      },
      {
        say: 'Questions give learners practice. For multiple choice, mark the right answer, give feedback on each option, and explain the answer.',
        act: async (p, h) => {
          await h.click(p.getByRole('button', { name: 'Add a block to step 1' }));
          await h.click(p.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Multiple choice/ }));
          const q = p.getByRole('region', { name: 'Multiple choice block 3' });
          await h.type(q.getByLabel('Question'), 'Which is the better problem statement?');
          await h.type(q.getByLabel('Answer 1', { exact: true }), 'Farmers in Kano lose a third of their tomatoes before market');
          await h.type(q.getByLabel('Answer 2', { exact: true }), 'Agriculture needs innovation');
        },
      },
      {
        say: 'If something is missing, the block tells you at once. Drag blocks by their handle to reorder them, or use each block’s menu to move, copy or remove it.',
        act: async (p, h) => {
          const q = p.getByRole('region', { name: 'Multiple choice block 3' });
          await h.point(q);
          await h.pause(600);
          await h.click(q.getByRole('button', { name: /actions$/ }));
          await h.pause(1400);
          await p.keyboard.press('Escape');
        },
      },
    ],
  },
  {
    id: 'videos',
    title: 'Add videos, captions and questions',
    summary: 'Upload to the video library, add captions, chapters and questions that pause the video.',
    steps: [
      {
        say: 'Videos live in your organisation’s video library. Upload once and use them in any course. They are prepared for streaming, so learners on slow connections can watch too.',
        act: async (p, h) => {
          await p.goto('/app/authoring/videos');
          await p.locator('input[type=file][multiple]').setInputFiles(h.state.videoFile);
          await h.pause(2500);
        },
      },
      {
        say: 'Uploads keep going while you work, and carry on after a dropped connection. When it is ready, open the video to add captions.',
        act: async (p, h) => {
          const card = p.getByRole('button', { name: /Lesson video/i });
          await card.getByText('Ready').waitFor({ timeout: 180_000 });
          await h.click(card);
        },
      },
      {
        say: 'Upload a caption file, or let speech recognition make them for you and correct them in the caption editor. Captions help everyone, and power the transcript learners can read.',
        act: async (p, h) => {
          const details = p.getByRole('dialog', { name: /Lesson video/i });
          await details.locator('input[accept=".vtt,.srt,text/vtt"]').setInputFiles(h.state.captionFile);
          await h.pause(1500);
          await h.point(details.getByText(/lines · from a file/));
          await h.click(details.getByRole('button', { name: 'Close' }));
        },
      },
      {
        say: 'In a lesson, add a Video block and choose it from the library. YouTube and Vimeo links work too: paste the link and the title is filled in.',
        act: async (p, h) => {
          await p.goto(h.state.draftUrl!);
          await h.click(outline(p).getByRole('button', { name: /What makes a good problem statement/ }).first());
          await h.click(p.getByRole('button', { name: 'Add a block to step 1' }));
          await h.click(p.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Video/ }));
          const v = p.getByRole('region', { name: 'Video block 4' });
          await h.click(v.getByRole('button', { name: 'Choose from the library' }));
          await h.click(p.getByRole('dialog', { name: 'Choose a video' }).getByRole('button', { name: /Lesson video/i }));
          await v.getByText('✓ Ready').waitFor();
        },
      },
      {
        say: 'Add chapters so learners can jump to each part. And add a question during the video: at the time you choose, the video pauses and asks one of this step’s questions.',
        act: async (p, h) => {
          const v = p.getByRole('region', { name: 'Video block 4' });
          await h.click(v.getByRole('button', { name: '+ Add chapter' }));
          await h.type(v.getByRole('textbox', { name: 'Title', exact: true }).last(), 'Introduction');
          await h.click(v.getByRole('button', { name: '+ Add question' }));
          await v.getByLabel('Pause 1 at').fill('');
          await h.type(v.getByLabel('Pause 1 at'), '0:20');
          await h.pause(800);
        },
      },
    ],
  },
  {
    id: 'assess',
    title: 'Quizzes, assignments, previews and downloads',
    summary: 'Graded quizzes, a practical assignment with a rubric, a free preview and files to download.',
    steps: [
      {
        say: 'Quizzes check what learners know. Set a pass mark and how many attempts they have, then add multiple choice, ordering or matching questions.',
        act: async (p, h) => {
          await p.goto(h.state.draftUrl!);
          await h.click(outline(p).getByRole('button', { name: 'Module 1 actions' }));
          await h.click(p.getByRole('menuitem', { name: 'Add a quiz' }));
          await h.pause(800);
          await h.point(p.getByLabel('Pass mark (%)'));
          await h.click(p.getByRole('button', { name: 'Add a question to the quiz' }));
          await h.pause(1200);
          await p.keyboard.press('Escape');
        },
      },
      {
        say: 'An assignment asks learners to make something real. Write the brief and the steps, and give a rubric so their work is marked fairly.',
        act: async (p, h) => {
          await h.click(outline(p).getByRole('button', { name: 'Module 1 actions' }));
          await h.click(p.getByRole('menuitem', { name: 'Add an assignment' }));
          await h.pause(800);
          await h.point(p.getByText(/Rubric \(faculty score/));
          await h.pause(800);
        },
      },
      {
        say: 'Tick Free preview on a lesson to let anyone try it from the course page before they enrol. It is a good way to show what your course feels like.',
        act: async (p, h) => {
          await h.click(outline(p).getByRole('button', { name: /What makes a good problem statement/ }).first());
          await h.click(p.getByRole('checkbox', { name: 'Free preview' }));
          await h.point(outline(p).getByText('Free').first());
        },
      },
      {
        say: 'Give learners a worksheet or slides with a Download block. Upload the file, give it a title, and it appears with a download button.',
        act: async (p, h) => {
          await h.click(p.getByRole('button', { name: 'Add a block to step 1' }));
          await h.click(p.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Download/ }));
          const d = p.getByRole('region', { name: /Download block/ });
          await d.locator('input[type=file]').setInputFiles(h.state.worksheet);
          await d.getByText(/KB|MB/).first().waitFor();
          await h.pause(800);
        },
      },
    ],
  },
  {
    id: 'publish',
    title: 'Review together and publish',
    summary: 'The Ready to publish checklist, comments from reviewers, and publishing a new version.',
    steps: [
      {
        say: 'Ready to publish lists anything that stops the course going for review, in plain words. Choose a line to go straight to it. Suggestions below help make the course better.',
        act: async (p, h) => {
          await p.goto(h.state.draftUrl!);
          await h.click(outline(p).getByRole('button', { name: /Ready to publish/ }));
          await h.pause(2500);
        },
      },
      {
        say: 'Reviewers comment on exactly what learners will see. In the preview, choose Comment on any block. Authors reply, fix it, and resolve the thread.',
        act: async (p, h) => {
          await h.click(outline(p).getByRole('button', { name: /What makes a good problem statement/ }).first());
          await h.click(p.getByRole('button', { name: 'Preview', exact: true }));
          const preview = p.getByLabel('Live preview');
          await preview.getByRole('button', { name: /^Comment on this/ }).first().click({ force: true });
          const comments = p.getByLabel('Comments');
          await h.type(comments.getByRole('textbox', { name: 'New comment' }), 'Could you add an example from your town?');
          await h.click(comments.getByRole('button', { name: 'Comment', exact: true }));
          await h.pause(1200);
        },
      },
      {
        say: 'When others open the same course, you see who is here, and you are warned before two people change the same lesson.',
        act: async (p, h) => {
          await h.point(p.getByRole('button', { name: /^Comments/ }));
          await h.pause(1500);
        },
      },
      {
        say: 'When everything is ready, choose Send for review. A reviewer reads it, asks for changes or publishes it. Learners already enrolled keep the version they started; new learners get the new one.',
        act: async (p, h) => {
          await h.click(p.getByRole('button', { name: 'Close comments' }));
          await h.point(p.getByRole('button', { name: 'Send for review' }));
          await h.pause(2500);
        },
      },
    ],
  },
];
