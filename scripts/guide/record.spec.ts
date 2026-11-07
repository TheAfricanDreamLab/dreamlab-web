import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { type Locator, type Page, test } from '@playwright/test';
import { createCompany, unique } from '../../e2e/helpers';
import { CHAPTERS, type Helpers } from './chapters';

/*
 * Records each chapter of the course-authoring guide against the local stack (see README.md here).
 * Needs out/narration.json from narrate.py: how long each line is spoken, so the screen waits for it.
 */

const OUT = resolve(__dirname, 'out');
const FILES = resolve(__dirname, '../../../../docs/UAT_Materials/Course_Authoring/files');
const VIEWPORT = { width: 1440, height: 810 };

/** A visible cursor and a ring on each click: screen recordings don't show the real pointer. */
const CURSOR = `
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(242,193,78,.55);border:2px solid #0a3d29;z-index:2147483647;pointer-events:none;transition:transform .12s';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { c.style.transform = 'scale(.7)'; }, true);
    addEventListener('mouseup', () => { c.style.transform = 'scale(1)'; }, true);
  });`;

test('record the course-authoring guide', async ({ browser }) => {
  test.setTimeout(45 * 60_000);
  mkdirSync(OUT, { recursive: true });
  const spoken = JSON.parse(readFileSync(join(OUT, 'narration.json'), 'utf8')) as Record<string, number[]>;

  // One author for every chapter, signed in once.
  const setup = await browser.newContext({ viewport: VIEWPORT });
  const first = await setup.newPage();
  await createCompany(first, 'Amaka Eze', unique('guide'), 'Lagos Builders Academy');
  const storageState = join(OUT, 'session.json');
  await setup.storageState({ path: storageState });
  await setup.close();

  const state: Helpers['state'] = {
    course: 'Solving Problems That Matter',
    videoFile: join(FILES, 'lesson-video.mp4'),
    captionFile: join(FILES, 'lesson-video.en.vtt'),
    worksheet: join(FILES, 'sample-interview-summary.pdf'),
  };

  for (const chapter of CHAPTERS) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, storageState, recordVideo: { dir: join(OUT, 'raw'), size: { width: 1280, height: 720 } } });
    await ctx.addInitScript(CURSOR);
    const page = await ctx.newPage();
    const opened = Date.now();
    const h = helpers(page, state);
    // Start on the chapter's first screen, so the recording doesn't open on a blank page.
    await page.goto(chapter.id === 'start' ? '/app/authoring' : chapter.id === 'videos' ? '/app/authoring/videos' : (state.draftUrl ?? '/app/authoring'));
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height / 2);
    await page.waitForTimeout(600);
    const t0 = Date.now();
    const starts: number[] = [];
    for (const [i, step] of chapter.steps.entries()) {
      const begin = Date.now();
      starts.push((begin - t0) / 1000);
      await step.act?.(page, h);
      // The next step waits until this line has been said, with a breath after it.
      const need = ((spoken[chapter.id]?.[i] ?? 3) + 0.8) * 1000;
      const left = need - (Date.now() - begin);
      if (left > 0) await page.waitForTimeout(left);
    }
    await page.waitForTimeout(800);
    const end = (Date.now() - t0) / 1000;
    const video = page.video()!;
    await ctx.close();
    renameSync(await video.path(), join(OUT, `${chapter.id}.webm`));
    writeFileSync(join(OUT, `${chapter.id}.timeline.json`), JSON.stringify({ offset: (t0 - opened) / 1000, starts, end }, null, 2));
  }
});

function helpers(page: Page, state: Helpers['state']): Helpers {
  const moveTo = async (target: Locator) => {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
  };
  return {
    state,
    pause: (ms) => page.waitForTimeout(ms),
    point: async (target) => {
      await moveTo(target);
      await page.waitForTimeout(500);
    },
    click: async (target) => {
      await moveTo(target);
      await page.waitForTimeout(220);
      await target.click();
      await page.waitForTimeout(350);
    },
    type: async (target, text) => {
      await moveTo(target);
      await target.click();
      // Replace what is there (a starting value or an example), as a person would.
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await target.pressSequentially(text, { delay: 32 });
      await page.waitForTimeout(250);
    },
  };
}
