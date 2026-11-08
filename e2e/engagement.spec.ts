import { expect, test } from '@playwright/test';
import { adminCredentials, createCompany, signedIn, signUpWithEmail, unique } from './helpers';

/*
 * LRN-9 staying on track, staff side: a cohort's engagement view (filter, select, send a check-in),
 * its completion funnel, and a course's funnel in the platform admin catalog.
 * Needs the full local stack with the catalog seeded (The African Dream Lab programme, Problem Solving).
 */

test('cohort staff see who is on track, send a check-in and read the completion funnel', async ({ page, browser }) => {
  const cohortName = `Cohort ${Date.now().toString(36).slice(-5)}`;
  const learnerName = 'Amaka Eze';
  const today = new Date().toISOString().slice(0, 10);

  // The host schedules a cohort starting today and opens it.
  await createCompany(page, 'Tunde Host', unique('host'), `Hub ${cohortName}`);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cohorts' }).click();
  await page.getByLabel('Name').fill(cohortName);
  await page.getByLabel('First day of week 1').fill(today);
  await page.getByLabel('Who can join').selectOption('open');
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+(?:\?created=1)?$/);
  await page.getByRole('button', { name: 'Open for joining' }).click();
  await expect(page.getByText('Open to join', { exact: true })).toBeVisible();
  const cohortUrl = page.url().split('?')[0]!;

  // A learner joins.
  const learnerContext = await browser.newContext();
  const learner = await learnerContext.newPage();
  await signUpWithEmail(learner, learnerName, unique('amaka'));
  await learner.goto('/programs/the-african-dream-lab');
  await learner.getByRole('button', { name: `Join ${cohortName}` }).click();
  await expect(learner).toHaveURL(/\/app\/programme(?:\?joined=[^&]*)?$/);
  await learnerContext.close();

  // The host opens the Engagement tab.
  await page.goto(cohortUrl);
  const tabs = page.getByRole('navigation', { name: 'Cohort pages' });
  await tabs.getByRole('link', { name: 'Engagement' }).click();
  await expect(page.getByRole('heading', { name: 'Engagement', level: 1 })).toBeVisible();
  const table = page.getByRole('table');
  await expect(table.getByRole('row').filter({ hasText: learnerName })).toHaveCount(1);
  await expect(page.getByText('Nobody selected')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send a check-in' })).toBeDisabled();

  // Someone who joined today can't be inactive: that filter is empty, and showing everyone brings them back.
  const tiles = page.getByRole('group', { name: 'Show learners by how they are doing' });
  await tiles.getByRole('button', { name: /^Inactive/ }).click();
  await expect(tiles.getByRole('button', { name: /^Inactive/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Nobody in this group right now.')).toBeVisible();
  await page.getByRole('button', { name: 'Show everyone' }).click();
  await expect(table.getByRole('row').filter({ hasText: learnerName })).toHaveCount(1);

  // Select all shown, then send a check-in from a ready-made message.
  await page.getByRole('checkbox', { name: /^Select all \d+ shown$/ }).check();
  await expect(page.getByRole('checkbox', { name: `Select ${learnerName}` })).toBeChecked();
  await expect(page.getByText('1 person selected')).toBeVisible();
  await page.getByRole('button', { name: 'Send a check-in' }).click();
  const dialog = page.getByRole('dialog', { name: 'Send a check-in' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(learnerName)).toBeVisible();
  await expect(dialog.getByText('Reminders and check-ins')).toBeVisible();
  // Too short first: it says so and doesn't send.
  await dialog.getByLabel('Your message').fill('Hi there');
  await dialog.getByRole('button', { name: 'Send to 1 learner' }).click();
  await expect(dialog.getByText('Write a little more: at least 10 characters.')).toBeVisible();
  await dialog.getByRole('button', { name: 'A quiet couple of weeks' }).click();
  await expect(dialog.getByLabel('Your message')).toHaveValue(/quiet couple of weeks/);
  await dialog.getByLabel('Your message').press('End');
  await dialog.getByLabel('Your message').pressSequentially(' Amaka, I’m here to help.');
  await dialog.getByRole('button', { name: 'Send to 1 learner' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/^Sent to 1 learner\./)).toBeVisible();
  await expect(page.getByText('Nobody selected')).toBeVisible();
  await expect(table.getByRole('row').filter({ hasText: learnerName })).toContainText('Today');

  // Escape closes the dialog without sending.
  await page.getByRole('checkbox', { name: `Select ${learnerName}` }).check();
  await page.getByRole('button', { name: 'Send a check-in' }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // The completion funnel.
  await tabs.getByRole('link', { name: 'Completion funnel' }).click();
  await expect(page.getByRole('heading', { name: 'Completion funnel', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How far people get' })).toBeVisible();
  await expect(page.locator('[data-stage="enrolled"]')).toContainText('1');
  await expect(page.locator('[data-stage="enrolled"]')).toContainText('100% of enrolled');
  await expect(page.getByRole('heading', { name: 'Check-ins' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Active each week' })).toBeVisible();
  await page.getByText('Show the numbers').click();
  await expect(page.getByRole('table', { name: 'Learners active each week' })).toBeVisible();
});

test('platform admins open a course’s completion funnel from the catalog', async ({ page }) => {
  const { email, password } = adminCredentials();
  await signedIn(page, email, password);
  await page.goto('/app/admin/catalog');
  await expect(page.getByRole('heading', { name: 'Catalog', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Completion funnel: Problem Solving' }).click();
  await expect(page).toHaveURL(/\/app\/admin\/catalog\/courses\/[a-z0-9-]+\/funnel$/);
  await expect(page.getByRole('heading', { name: 'Problem Solving', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How far people get' }).or(page.getByText('Nobody has enrolled yet, so there is nothing to show.'))).toBeVisible();
  await page.getByRole('link', { name: 'Catalog' }).first().click();
  await expect(page.getByRole('heading', { name: 'Catalog', level: 1 })).toBeVisible();
});
