import { type Browser, expect as baseExpect, type Page, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * LIVE-1 in a real room: a mentor and their mentee meet on camera, then faculty start a live class
 * that a learner joins with their microphone, and the class register marks the learner present from
 * LiveKit's webhooks. Browsers use Chromium's fake camera and microphone. Needs the full local stack
 * with LiveKit (docker compose) and the catalog seeded.
 */

// Rooms, cohorts and webhooks take longer than a page: give every check more time.
const expect = baseExpect.configure({ timeout: 45_000 });

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

const MEDIA = ['camera', 'microphone'];

async function newPerson(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL, permissions: MEDIA });
  return context.newPage();
}

async function acceptInvite(browser: Browser, link: string, name: string, email: string): Promise<Page> {
  const page = await newPerson(browser);
  await page.goto(link);
  await page.getByRole('link', { name: 'Create my account to accept' }).click();
  await expect(page).toHaveURL(/\/signup/);
  await signUpWithEmail(page, name, email, PASSWORD, page.url());
  await expect(page).toHaveURL(/\/invitations\/accept$/);
  await page.getByRole('button', { name: 'Accept and join' }).click();
  await expect(page).toHaveURL(/\/app(?:\?joined=1)?$/);
  return page;
}

/** A datetime-local value a few minutes from now in a time zone. */
function soonIn(timeZone: string, minutes: number): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(Date.now() + minutes * 60_000))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Connected to the room, with the given number of people on the stage. */
async function inRoom(page: Page, people: number): Promise<void> {
  await expect(page.locator('.lk-room-container, [data-lk-theme]').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.lk-participant-tile')).toHaveCount(people, { timeout: 60_000 });
}

/** Turn a device on from the room's control bar. */
async function turnOn(page: Page, source: 'camera' | 'microphone'): Promise<void> {
  const toggle = page.locator(`.lk-control-bar [data-lk-source="${source}"]`);
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
}

/** How many video elements on the page are actually playing frames. */
async function playingVideos(page: Page): Promise<number> {
  return page.locator('video').evaluateAll((els) => els.filter((v) => (v as HTMLVideoElement).readyState >= 2 && (v as HTMLVideoElement).videoWidth > 0).length);
}

test('a mentor and mentee meet on camera, and a learner joins a live class that marks them present', async ({ page, browser }) => {
  test.setTimeout(420_000);
  await page.context().grantPermissions(MEDIA);
  const suffix = Date.now().toString(36).slice(-5);
  const cohortName = `Room ${suffix}`;
  const mentorEmail = unique('roommentor');

  // A company schedules an open cohort starting today and invites a mentor.
  await createCompany(page, 'Halima Host', unique('roomhost'), `Room Hub ${suffix}`);
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByLabel('Email or phone').fill(mentorEmail);
  await page.getByRole('radio', { name: /Mentor/ }).check();
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${mentorEmail}.`)).toBeVisible();
  const mentorLink = (await latestInviteLink(mentorEmail)).replace(/^https?:\/\/[^/]+/, '');
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cohorts' }).click();
  await page.getByLabel('Name').fill(cohortName);
  await page.getByLabel('First day of week 1').fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel('Who can join').selectOption('open');
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+(?:\?created=1)?$/);
  await page.getByRole('button', { name: 'Open for joining' }).click();
  await expect(page.getByText('Open to join', { exact: true })).toBeVisible();
  const cohortUrl = page.url().split('?')[0]!;

  const mentor = await acceptInvite(browser, mentorLink, 'Musa Mentor', mentorEmail);
  const ada = await newPerson(browser);
  await signUpWithEmail(ada, 'Ada Obi', unique('roomada'));
  await ada.goto('/programs/the-african-dream-lab');
  await ada.getByRole('button', { name: `Join ${cohortName}` }).click();
  await expect(ada).toHaveURL(/\/app\/programme(?:\?joined=[^&]*)?$/);

  await page.goto(cohortUrl);
  await page.getByRole('link', { name: 'Mentors and Dream Circles' }).click();
  await page.getByLabel('Mentor', { exact: true }).selectOption({ label: 'Musa Mentor' });
  await page.getByRole('group', { name: 'Learners' }).getByLabel('Ada Obi').check();
  await page.getByRole('button', { name: 'Assign mentor' }).click();
  await expect(page.getByText('Mentor assigned. They have both been told.')).toBeVisible();

  // The mentor meeting: both on camera, each sees the other.
  await mentor.goto('/app/mentoring');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  await mentor.getByLabel('When (your time)').fill(soonIn(tz, 5));
  await mentor.getByRole('button', { name: 'Schedule meeting' }).click();
  await expect(mentor.getByText('Scheduled with Ada Obi. They have been told.')).toBeVisible();
  await mentor.getByRole('link', { name: 'Join meeting with Ada Obi' }).click();
  await expect(mentor.getByText('You’re hosting')).toBeVisible();
  await inRoom(mentor, 1);
  await turnOn(mentor, 'camera');
  await turnOn(mentor, 'microphone');

  await ada.goto('/app/programme/community');
  await ada.getByRole('heading', { name: 'My community' }).locator('..').getByRole('link', { name: 'Join meeting' }).click();
  await inRoom(ada, 2);
  await turnOn(ada, 'camera');
  await inRoom(mentor, 2);
  await expect(ada.locator('.lk-participant-name', { hasText: 'Musa Mentor' })).toBeVisible();
  await expect(mentor.locator('.lk-participant-name', { hasText: 'Ada Obi' })).toBeVisible();
  // Each browser plays its own camera and the other person's.
  await expect.poll(() => playingVideos(ada), { timeout: 60_000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(() => playingVideos(mentor), { timeout: 60_000 }).toBeGreaterThanOrEqual(2);
  await ada.locator('.lk-disconnect-button').click();
  await mentor.locator('.lk-disconnect-button').click();
  await expect(ada.getByText('You’ve left the room.')).toBeVisible();

  // The live class: faculty move a week-1 online class to a few minutes from now and start it.
  await page.goto(`${cohortUrl}?week=1`);
  const online = page.locator('li').filter({ hasText: '· Online' }).first();
  await online.getByRole('button', { name: /^Edit/ }).click();
  const starts = online.getByLabel(/^Starts \(/);
  const cohortTz = /Starts \((.+)\)/.exec((await online.locator('label').filter({ hasText: 'Starts (' }).innerText()) ?? '')?.[1] ?? 'Africa/Lagos';
  await starts.fill(soonIn(cohortTz.trim(), 5));
  await online.getByRole('button', { name: 'Save class' }).click();
  await expect(page.getByRole('status').filter({ hasText: /saved|updated/i }).first()).toBeVisible();
  await online.getByRole('link', { name: /^(Register|Attendance) for / }).click();
  // Read the address once the register has opened, not while the click is still navigating.
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+/);
  const register = page.url();
  await page.getByRole('link', { name: 'Start class' }).click();
  await inRoom(page, 1);
  await turnOn(page, 'camera');

  // The learner joins with their microphone: a class gives learners no camera or screen.
  await ada.goto('/app/programme/calendar');
  await ada.getByRole('link', { name: 'Join class' }).first().click();
  await inRoom(ada, 2);
  await expect(ada.locator('.lk-control-bar [data-lk-source="camera"]')).toHaveCount(0);
  await turnOn(ada, 'microphone');
  await inRoom(page, 2);
  await expect(page.locator('.lk-participant-name', { hasText: 'Ada Obi' })).toBeVisible();
  await expect.poll(() => playingVideos(ada), { timeout: 60_000 }).toBeGreaterThanOrEqual(1);

  // LiveKit's webhook marks the learner present on the register.
  await page.locator('.lk-disconnect-button').click();
  await expect
    .poll(
      async () => {
        await page.goto(register);
        return page.getByRole('group', { name: 'Attendance for Ada Obi' }).getByRole('radio', { name: 'Present' }).isChecked();
      },
      { timeout: 90_000, intervals: [3_000] },
    )
    .toBe(true);

  for (const p of [mentor, ada]) await p.context().close();
});
