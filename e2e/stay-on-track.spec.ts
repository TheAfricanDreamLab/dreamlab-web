import { type Browser, expect, type Page, test } from '@playwright/test';
import { createCompany, signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * LRN-9 "Staying on track", the learner's side: a goal and study plan when they start, the first-week
 * checklist, their pace and catch-up plan, the way to the certificate, sharing a week's progress with
 * a Dream Circle, and save-data mode. Needs the full local stack with the catalog seeded, and an API
 * with the engagement routes (contracts 0.23.0).
 */

const WHY = 'I want to turn my tailoring into a business that pays the rent for my family.';

/** Fill and save the goal form inside `scope` (a course home or My programme). */
async function setGoal(page: Page): Promise<void> {
  const why = page.getByLabel('Why are you doing this?');
  // Too short first: the form says so and keeps what was typed.
  await why.fill('To learn');
  await page.getByText('Mon', { exact: true }).click();
  await page.getByRole('button', { name: 'Save my plan' }).click();
  await expect(page.getByText('A sentence or two, in your own words (at least 20 characters)')).toBeVisible();
  await expect(why).toHaveValue('To learn');

  await why.fill(WHY);
  await page.getByLabel(/What will finishing let you do/).fill('Pitch to a microfinance lender with a real plan.');
  await page.getByText('Wed', { exact: true }).click();
  await page.getByText('Sat', { exact: true }).click();
  await page.getByText('2 h', { exact: true }).click();
  await page.getByLabel(/At what time/).fill('20:00');
  await page.getByRole('button', { name: 'Save my plan' }).click();
  await expect(page.getByText('Saved. We’ll show you this when you need a reminder of why you started.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why you’re here' })).toBeVisible();
  await expect(page.getByText(`“${WHY}”`).first()).toBeVisible();
  await expect(page.getByText('Mon, Wed and Sat at 20:00 · 2 h a week')).toBeVisible();
}

test.describe('a course taken on its own', () => {
  test('offers the goal form after enrolling, keeps a first-week checklist, and shows the goal back', async ({ page }) => {
    await signUpWithEmail(page, 'Ngozi Eze', unique('ngozi'));
    await page.goto('/courses/problem-solving');
    await page.getByRole('button', { name: 'Enrol for free' }).click();
    await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}$/);
    const courseHome = page.url();

    // Right after enrolling: a welcome and the goal form, before anything else.
    await expect(page.getByRole('heading', { name: 'Welcome. What brings you to Problem Solving?' })).toBeVisible();
    const firstWeek = page.getByRole('region', { name: 'Your first week' });
    await expect(firstWeek.getByText('0 of 2 done')).toBeVisible();
    await expect(firstWeek.getByRole('link', { name: /Finish your first lesson/ })).toBeVisible();

    // "Not now" folds it away; it can be opened again.
    await page.getByRole('button', { name: 'Not now' }).click();
    await page.getByRole('button', { name: 'Set your goal' }).click();
    await setGoal(page);
    await expect(firstWeek.getByText('1 of 2 done')).toBeVisible();

    // Editable later: the form opens with what was saved.
    await page.getByRole('button', { name: 'Change goal or plan' }).click();
    await expect(page.getByLabel('Why are you doing this?')).toHaveValue(WHY);
    await page.getByRole('button', { name: 'Cancel' }).click();

    // My learning shows the course's pace, and no goal prompt now it's set.
    await page.goto('/app/learning');
    const card = page.locator('[data-pace]').first();
    await expect(card).toBeVisible();
    await expect(page.getByRole('link', { name: /Set your goal for this course/ })).toHaveCount(0);

    // The checklist's lesson link opens the first lesson.
    await page.goto(courseHome);
    await page.getByRole('region', { name: 'Your first week' }).getByRole('link', { name: /Finish your first lesson/ }).click();
    await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
  });
});

async function scheduleCohort(page: Page, cohortName: string, startsOn: string): Promise<string> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cohorts' }).click();
  await page.getByLabel('Name').fill(cohortName);
  await page.getByLabel('First day of week 1').fill(startsOn);
  await page.getByLabel('Who can join').selectOption('open');
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+(?:\?created=1)?$/);
  await page.getByRole('button', { name: 'Open for joining' }).click();
  await expect(page.getByText('Open to join', { exact: true })).toBeVisible();
  return page.url().split('?')[0]!;
}

async function joinCohort(browser: Browser, name: string, cohortName: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL });
  const page = await context.newPage();
  await signUpWithEmail(page, name, unique(name.split(' ')[0]!.toLowerCase()));
  await page.goto('/programs/the-african-dream-lab');
  await page.getByRole('button', { name: `Join ${cohortName}` }).click();
  await expect(page).toHaveURL(/\/app\/programme(?:\?joined=[^&]*)?$/);
  return page;
}

test('a cohort learner sets a goal on joining, sees their pace, a catch-up plan and the way to the certificate', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const suffix = Date.now().toString(36).slice(-5);
  const cohortName = `Cohort ${suffix}`;
  // Started three weeks ago: the calendar expects some progress by now, and the learner has none.
  const startsOn = new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10);

  await createCompany(page, 'Halima Host', unique('host'), `Pace Hub ${suffix}`);
  await scheduleCohort(page, cohortName, startsOn);
  const learner = await joinCohort(browser, 'Kofi Mensah', cohortName);

  // Joining offers the goal straight away.
  await expect(learner.getByRole('heading', { name: 'Welcome. What brings you to The African Dream Lab?' })).toBeVisible();
  await setGoal(learner);

  // The overview keeps one next step, with the pace as a quiet line that opens the Progress tab.
  await expect(learner.getByRole('heading', { name: 'Your next step' })).toBeVisible();
  await learner.getByRole('link', { name: 'See your pace' }).first().click();
  await expect(learner).toHaveURL(/\/app\/programme\/progress$/);
  await expect(learner.getByRole('navigation', { name: 'Programme pages' }).getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-current', 'page');

  // The pace card: plain words, progress against the calendar, and when behind a short, kind list.
  const pace = learner.getByRole('region', { name: `Your pace in ${cohortName}` });
  await expect(pace).toBeVisible();
  const state = await pace.getAttribute('data-pace');
  expect(['not_started', 'on_track', 'behind', 'far_behind']).toContain(state);
  if (state === 'behind' || state === 'far_behind') {
    await expect(pace.getByRole('heading', { name: 'Do these to get back on track' })).toBeVisible();
    const plan = pace.getByRole('list', { name: 'Your catch-up plan' });
    const items = plan.getByRole('listitem');
    expect(await items.count()).toBeGreaterThan(0);
    expect(await items.count()).toBeLessThanOrEqual(3);
    // The goal is shown back as a reminder when behind.
    await expect(pace.getByText(`“${WHY}”`)).toBeVisible();
    await expect(pace.getByText(/about \d+% expected by now/)).toBeVisible();
    await expect(pace).not.toContainText(/overdue|failing|you missed/i);
    await plan.getByRole('link', { name: /^Start / }).first().click();
    await expect(learner).toHaveURL(/\/learn\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
    // On the overview too, quietly.
    await learner.goto('/app/programme');
    await expect(learner.getByText('Remember why you started')).toBeVisible();
  }

  // The way to the certificate counts what's done.
  await learner.goto('/app/programme/progress');
  const certificate = learner.getByRole('region', { name: 'Your way to the certificate in The African Dream Lab' });
  await expect(certificate.getByText(/^\d+ of \d+ done$/)).toBeVisible();
  expect(await certificate.getByRole('listitem').count()).toBeGreaterThan(0);

  // The first week, on the overview: the goal is ticked, the rest link where to do them.
  await learner.goto('/app/programme');
  const firstWeek = learner.getByRole('region', { name: 'Your first week' });
  await expect(firstWeek.getByText(/^1 of [23] done$/)).toBeVisible();
  await expect(firstWeek.getByText('Set your goal')).toBeVisible();

  // Catch-up weeks stand out in the calendar (when the programme has any).
  await learner.goto('/app/programme/calendar');
  await expect(learner.getByRole('heading', { name: 'Week by week' })).toBeVisible();
  const catchUpWeeks = learner.locator('tr[data-week-kind="catch_up"]');
  for (let i = 0; i < (await catchUpWeeks.count()); i++) await expect(catchUpWeeks.nth(i).getByText('Catch-up week')).toBeVisible();
  await learner.context().close();
});

test('Dream Circle members choose to share their week, and nobody is ranked', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const suffix = Date.now().toString(36).slice(-5);
  const cohortName = `Cohort ${suffix}`;

  await createCompany(page, 'Halima Host', unique('host'), `Circle Hub ${suffix}`);
  const cohortUrl = await scheduleCohort(page, cohortName, new Date().toISOString().slice(0, 10));
  const ada = await joinCohort(browser, 'Ada Obi', cohortName);
  const tunde = await joinCohort(browser, 'Tunde Bakare', cohortName);

  await page.goto(cohortUrl);
  await page.getByRole('link', { name: 'Mentors and Dream Circles' }).click();
  const newCircle = page.getByRole('heading', { name: 'Form a circle' }).locator('..');
  await newCircle.getByLabel('Circle name').fill('Sankofa');
  await newCircle.getByLabel('Ada Obi').check();
  await newCircle.getByLabel('Tunde Bakare').check();
  await newCircle.getByRole('button', { name: 'Form circle' }).click();
  await expect(page.getByText('Sankofa is formed. Its members have been told.')).toBeVisible();

  // Nobody shares until they choose to.
  await ada.goto('/app/programme/community');
  await ada.getByRole('link', { name: 'Open circle' }).click();
  await expect(ada.getByRole('heading', { name: 'Sankofa', level: 1 })).toBeVisible();
  await expect(ada.getByRole('heading', { name: 'This week' })).toBeVisible();
  const share = ada.getByRole('switch', { name: 'Share my progress with this circle' });
  await expect(share).toHaveAttribute('aria-checked', 'false');
  await expect(ada.getByText('Nobody is sharing their week yet. You could be the first.')).toBeVisible();
  await expect(ada.getByText('2 members keep theirs private.', { exact: false })).toBeVisible();

  // Ada shares: she appears with her week; Tunde still keeps his private.
  await share.click();
  await expect(ada.getByText('Saved. Your circle can now see your week.')).toBeVisible();
  await expect(share).toHaveAttribute('aria-checked', 'true');
  const sharing = ada.getByRole('list', { name: 'Members sharing their week' });
  await expect(sharing.getByText('Ada Obi')).toBeVisible();
  await expect(sharing.getByText('(you)')).toBeVisible();
  await expect(sharing.getByRole('img', { name: /Ada Obi: active \d days? of 7 this week/ })).toBeVisible();
  await expect(ada.getByText('1 member keeps theirs private.', { exact: false })).toBeVisible();

  // Tunde sees Ada's week; nothing on the page ranks anyone.
  const circleUrl = ada.url();
  await tunde.goto(circleUrl);
  await expect(tunde.getByRole('list', { name: 'Members sharing their week' }).getByText('Ada Obi')).toBeVisible();
  await expect(tunde.locator('body')).not.toContainText(/leaderboard|\brank|top of the circle/i);

  // Ada stops sharing: private again.
  await share.click();
  await expect(ada.getByText('Saved. Your progress is private again.')).toBeVisible();
  await tunde.reload();
  await expect(tunde.getByText('Nobody is sharing their week yet', { exact: false })).toBeVisible();
  await ada.context().close();
  await tunde.context().close();
});

test('save data is a per-device choice, on the account page and in the lesson player', async ({ page, browser }) => {
  await signUpWithEmail(page, 'Zainab Bello', unique('zainab'));
  await page.goto('/app/account');

  // The new email category shows with the rest.
  await expect(page.getByLabel('Reminders and check-ins to keep my learning on track')).toBeChecked();

  const toggle = page.getByRole('switch', { name: 'Save data on this device' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => window.localStorage.getItem('dreamlab:save-data'))).toBe('1');
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Save data on this device' })).toHaveAttribute('aria-checked', 'true');

  // Another device (browser) has its own choice.
  const other = await browser.newContext({ baseURL: WEB_URL });
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  expect(await otherPage.evaluate(() => window.localStorage.getItem('dreamlab:save-data'))).toBeNull();
  await other.close();

  // In a lesson with a video from the library, the player offers the same switch and follows it:
  // no poster loaded, the transcript first, "Listen instead" when there is a sound-only version.
  // The seeded catalogue's videos are on YouTube, so this part runs only when a library video is there.
  await page.goto('/courses/problem-solving');
  await page.getByRole('button', { name: 'Enrol for free' }).click();
  await page.getByRole('link', { name: 'Start the course' }).click();
  const libraryVideo = page.locator('[data-media="video"][data-save-data]');
  if (await libraryVideo.count()) {
    await expect(libraryVideo.first()).toHaveAttribute('data-save-data', 'on');
    await expect(page.getByRole('switch', { name: 'Save data' })).toHaveAttribute('aria-checked', 'true');
    await expect(libraryVideo.first().locator('img')).toHaveCount(0);
    await page.getByRole('switch', { name: 'Save data' }).click();
    await expect(libraryVideo.first()).toHaveAttribute('data-save-data', 'off');
  } else {
    await expect(page.getByRole('switch', { name: 'Save data' })).toHaveCount(0);
  }
});
