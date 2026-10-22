import { expect, test } from '@playwright/test';
import { createCompany, signUpWithEmail, unique } from './helpers';

/*
 * LRN-2 cohorts: an organisation schedules and opens a cohort of the programme, a learner joins it
 * from the programme page and chooses an elective, and the organisation takes attendance.
 * Needs the full local stack with the catalog seeded (The African Dream Lab programme).
 */

test('an organisation runs a cohort; a learner joins it, chooses an elective and is marked present', async ({ page, browser }) => {
  const cohortName = `Cohort ${Date.now().toString(36).slice(-5)}`;
  const learnerName = 'Chidi Okafor';
  const today = new Date().toISOString().slice(0, 10);

  // The host schedules a cohort starting today and opens it to anyone signed in.
  await createCompany(page, 'Halima Host', unique('host'), `Hub ${cohortName}`);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cohorts' }).click();
  await expect(page.getByRole('heading', { name: 'Cohorts', level: 1 })).toBeVisible();
  await page.getByLabel('Name').fill(cohortName);
  await page.getByLabel('First day of week 1').fill(today);
  await page.getByLabel('Who can join').selectOption('open');
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+\?created=1/);
  await expect(page.getByText('Scheduled: 15 weeks and 45 classes')).toBeVisible();
  await page.getByRole('button', { name: 'Open for joining' }).click();
  await expect(page.getByText('Open to join', { exact: true })).toBeVisible();
  const cohortUrl = page.url().split('?')[0]!;

  // The first class gets its join link.
  await page.getByRole('button', { name: /^Edit/ }).first().click();
  await page.getByLabel('Join link').fill('https://meet.example.org/dream-lab');
  await page.getByRole('button', { name: 'Save class' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // A learner finds the cohort on the programme page and joins it.
  const learnerContext = await browser.newContext();
  const learner = await learnerContext.newPage();
  await signUpWithEmail(learner, learnerName, unique('chidi'));
  await learner.goto('/programs/the-african-dream-lab');
  await expect(learner.getByRole('heading', { name: 'Join a cohort' })).toBeVisible();
  await learner.getByRole('button', { name: `Join ${cohortName}` }).click();
  await expect(learner).toHaveURL(/\/app\/programme\?joined=/);
  await expect(learner.getByText(`You’ve joined ${cohortName}`)).toBeVisible();
  await expect(learner.getByRole('heading', { name: 'Your courses' })).toBeVisible();
  await expect(learner.getByText('Week 1 of 15')).toBeVisible();
  await expect(learner.getByRole('link', { name: 'Join class' }).first()).toBeVisible();

  // One elective, before the deadline.
  const electives = learner.getByRole('heading', { name: 'Electives' }).locator('..');
  await electives.getByRole('radio').first().check();
  await electives.getByRole('button', { name: 'Save my choice' }).first().click();
  await expect(learner.getByText('Saved. Your elective is in your courses.')).toBeVisible();
  await expect(learner.getByText('Elective', { exact: false }).first()).toBeVisible();

  // The host sees the learner and marks them present at the first class.
  await page.goto(cohortUrl);
  await expect(page.getByText(learnerName)).toBeVisible();
  await page.getByRole('link', { name: /^(Register|Attendance) for / }).first().click();
  await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible();
  await page.getByRole('group', { name: `Attendance for ${learnerName}` }).getByText('Present').click();
  await page.getByRole('button', { name: 'Save attendance' }).click();
  await expect(page.getByText('Attendance saved for one learner.')).toBeVisible();
  await expect(page.getByText('1 of 1 marked')).toBeVisible();

  // The learner can't take attendance.
  await learner.goto(page.url());
  await expect(learner.getByRole('heading', { name: 'Register' })).toHaveCount(0);
  await learnerContext.close();
});

test('My programme invites people without a cohort to find one', async ({ page }) => {
  await signUpWithEmail(page, 'Bola Ade', unique('bola'));
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My programme' }).click();
  await expect(page.getByText('You haven’t joined a cohort yet.')).toBeVisible();
  await page.getByRole('link', { name: 'See upcoming cohorts' }).click();
  await expect(page.getByRole('heading', { name: 'The African Dream Lab', level: 1 })).toBeVisible();
});
