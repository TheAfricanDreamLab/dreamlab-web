import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { createCompany, unique } from './helpers';

/*
 * CAT-6: an organisation uploads a video to its library, where it is processed for streaming on the
 * local video worker; adds captions; uses it in a lesson with chapters and a question during the
 * video; marks the lesson as a free preview; comments on it while reviewing; publishes; and a
 * visitor opens the free preview. Needs the full local stack and ffmpeg.
 */

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

test('a course team builds a video lesson from the library, reviews it with comments, and visitors preview it free', async ({ page, browser }) => {
  test.skip(!hasFfmpeg, 'ffmpeg is needed to make the test video');
  test.setTimeout(300_000);
  const suffix = Date.now().toString(36).slice(-5);
  const course = `Adire Dyeing ${suffix}`;
  const clipTitle = `Folding the cloth ${suffix}`;

  // Six seconds of 720p picture and sound.
  const dir = tmpdir();
  const clip = join(dir, `${clipTitle.replace(/\s+/g, '-')}.mp4`);
  expect(
    spawnSync('ffmpeg', ['-hide_banner', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=6:size=1280x720:rate=24', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=6', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', clip]).status,
  ).toBe(0);
  const vtt = join(dir, `adire-${suffix}.vtt`);
  writeFileSync(vtt, 'WEBVTT\n\n00:00:00.500 --> 00:00:02.500\nFold the cloth in pleats.\n\n00:00:03.000 --> 00:00:05.500\nTie it tightly with raffia.\n');

  await createCompany(page, 'Bisi Owner', unique('adire'), `Adire House ${suffix}`);

  // ---------- the video library ----------
  await page.goto('/app/authoring');
  await page.getByRole('link', { name: 'Video library' }).click();
  await expect(page.getByRole('heading', { name: 'Video library', level: 1 })).toBeVisible();
  await page.locator('input[type=file][multiple]').setInputFiles(clip);
  const uploads = page.getByRole('region', { name: 'Video uploads' });
  await expect(uploads.getByText('✓ Uploaded')).toBeVisible({ timeout: 60_000 });
  // Processed on the local video worker: 360p and 720p streams, a poster and its length.
  const card = page.getByRole('button', { name: new RegExp(clipTitle, 'i') });
  await expect(card.getByText('Ready')).toBeVisible({ timeout: 120_000 });
  await expect(card.getByText('0:06')).toBeVisible();
  await card.click();
  const details = page.getByRole('dialog', { name: new RegExp(clipTitle, 'i') });
  await expect(details.getByRole('button', { name: /Play video/ })).toBeVisible();
  await details.locator('input[accept=".vtt,.srt,text/vtt"]').setInputFiles(vtt);
  await expect(page.getByText('English captions added: 2 lines.')).toBeVisible();
  await expect(details.getByText('2 lines · from a file')).toBeVisible();
  await details.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('button', { name: new RegExp(clipTitle, 'i') }).getByText('CC EN')).toBeVisible();

  // ---------- a lesson that uses it ----------
  await page.goto('/app/authoring');
  await page.getByLabel('Course title').fill(course);
  await page.getByRole('button', { name: 'Start writing' }).click();
  await page.getByLabel('Subtitle', { exact: true }).fill('Resist dyeing with indigo');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('How Abeokuta dyers fold, tie and dye adire cloth.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('What learners will be able to do').fill('Fold cloth for tie-dye\nMix an indigo vat');
  await page.getByLabel('Who it is for').fill('Textile apprentices');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Module title').fill('Preparing the cloth');
  await page.getByLabel('First lesson title').fill('Folding and tying');
  await page.getByRole('button', { name: 'Start writing' }).click();
  const outline = page.getByRole('navigation', { name: 'Course outline' });
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Folding and tying');

  // A question first, so the video can ask it.
  await page.getByRole('button', { name: 'Add a block to step 1' }).click();
  await page.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Multiple choice/ }).click();
  const question = page.getByRole('region', { name: 'Multiple choice block 2' });
  await question.getByLabel('Question').fill('What holds the folds in place?');
  await question.getByLabel('Answer 1', { exact: true }).fill('Raffia ties');
  await question.getByLabel('Answer 2', { exact: true }).fill('Starch');

  await page.getByRole('button', { name: 'Add a block to step 1' }).click();
  await page.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Video/ }).click();
  const video = page.getByRole('region', { name: 'Video block 3' });
  await video.getByRole('button', { name: 'Choose from the library' }).click();
  await page.getByRole('dialog', { name: 'Choose a video' }).getByRole('button', { name: new RegExp(clipTitle, 'i') }).click();
  await expect(video.getByText('✓ Ready')).toBeVisible({ timeout: 20_000 });
  await expect(video.getByText('Captions: English')).toBeVisible();
  await expect(video.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(clipTitle);
  await video.getByRole('button', { name: '+ Add chapter' }).click();
  await video.getByRole('textbox', { name: 'Title', exact: true }).last().fill('Folding');
  await video.getByRole('button', { name: '+ Add chapter' }).click();
  await video.getByLabel('Chapter 2 starts at').fill('0:03');
  await video.getByRole('textbox', { name: 'Title', exact: true }).last().fill('Tying');
  await video.getByRole('button', { name: '+ Add question' }).click();
  await video.getByLabel('Pause 1 at').fill('0:02');
  await expect(video.getByLabel('Ask')).toHaveValue('choice-2');

  // A worksheet to download, and the lesson opened as a free preview.
  await page.getByRole('checkbox', { name: 'Free preview' }).check();
  await expect(outline.getByText('Free')).toBeVisible();

  // Unlisted, so a visitor with the link can see the course and its preview.
  await outline.getByRole('button', { name: 'Course details' }).click();
  await page.getByLabel('Who can see it').selectOption('unlisted');
  await page.keyboard.press('Control+s');
  await expect(page.getByText('Saved. Ready to send for review.')).toBeVisible({ timeout: 20_000 });

  // ---------- review: a comment on the video, from the live preview ----------
  await outline.getByRole('button', { name: /Folding and tying/ }).first().click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.getByLabel('Live preview');
  await preview.getByRole('button', { name: 'Comment on this video' }).click({ force: true });
  const comments = page.getByLabel('Comments');
  await expect(comments.getByText(/› Video$/)).toBeVisible();
  await comments.getByRole('textbox', { name: 'New comment' }).fill('Show the knot up close at 0:04.');
  await comments.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(comments.getByText('Show the knot up close at 0:04.')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Comments/ })).toContainText('1');
  await expect(outline.getByTitle('1 open comment')).toBeVisible();
  await comments.getByRole('textbox', { name: 'Reply' }).fill('Done: added a close-up.');
  await comments.getByRole('textbox', { name: 'Reply' }).press('Enter');
  await expect(comments.getByText('Done: added a close-up.')).toBeVisible();
  await comments.getByRole('button', { name: 'Resolve' }).click();
  await expect(comments.getByText('No open comments.', { exact: false })).toBeVisible();
  await comments.getByRole('tab', { name: 'Resolved' }).click();
  await expect(comments.getByText(/Resolved by Bisi Owner/)).toBeVisible();
  await page.getByRole('button', { name: 'Close comments' }).click();

  // ---------- publish ----------
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('Sent for review.')).toBeVisible();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText(/Published as version 1/).first()).toBeVisible();
  const slug = `adire-dyeing-${suffix}`;

  // ---------- a visitor opens the free preview ----------
  const visitor = await browser.newContext();
  const guest = await visitor.newPage();
  await guest.goto(`/courses/${slug}`);
  await guest.getByRole('link', { name: /Folding and tying.*Preview/ }).click();
  await expect(guest.getByRole('heading', { name: 'Folding and tying', level: 1 })).toBeVisible();
  await expect(guest.getByText('Free preview · nothing you do here is saved')).toBeVisible();
  await expect(guest.getByRole('navigation', { name: new RegExp(`Chapters of ${clipTitle}`, 'i') }).getByRole('button', { name: /Tying/ })).toBeVisible();
  await expect(guest.getByText('A question comes up at 0:02 in the video')).toBeVisible();
  // The stream plays (hls.js, from this site's /media path), with captions and a transcript.
  await guest.getByRole('button', { name: new RegExp(`Play video: ${clipTitle}`, 'i') }).click();
  const player = guest.locator('video');
  await expect(player).toBeVisible();
  await expect.poll(async () => player.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
  await guest.getByRole('button', { name: 'Transcript' }).click();
  await expect(guest.getByRole('region', { name: 'Transcript' }).getByText('Tie it tightly with raffia.')).toBeVisible();
  // The question comes up when playback reaches it.
  await player.evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    void v.play();
  });
  await expect(guest.getByText('Question at 0:02 · the video is paused')).toBeVisible({ timeout: 20_000 });
  await guest.getByRole('radio', { name: 'Raffia ties' }).first().check();
  await guest.getByRole('button', { name: 'Check' }).first().click();
  await expect(guest.getByText(/Enrol in the course to have your answers checked/).first()).toBeVisible();
  await visitor.close();
});
