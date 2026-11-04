import { expect, test } from '@playwright/test';
import { signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * Fixes from the first round of production UAT (November 2026), one test per reported case.
 */

test('VIS-007: the terms and privacy pages are the real text, linked from each other', async ({ page }) => {
  for (const [path, title] of [
    ['/terms', 'Terms of use'],
    ['/privacy', 'Privacy policy'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.getByText(/being finalised|will appear here before launch/i)).toHaveCount(0);
    await expect(page.getByText('African Dream Network').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'privacy@theafricandreamlab.com' }).first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible();
  }
});

test('VIS-010: the catalogue searches as you type', async ({ page }) => {
  await page.goto('/courses');
  await page.getByLabel('Search courses').fill('problem');
  await expect(page).toHaveURL(/[?&]q=problem/);
  await expect(page.getByRole('link', { name: /Problem Solving/ }).first()).toBeVisible();
});

test('LRN-016 and ORG-021: email choices stick, and Save is active only after a change', async ({ page }) => {
  await signUpWithEmail(page, 'Pref Learner', unique('prefs'));
  await page.goto('/app/account#notifications');
  const grades = page.getByLabel('Grades and feedback on my work');
  const save = page.getByRole('button', { name: 'Save email choices' });
  await expect(grades).toBeChecked();
  await expect(save).toBeDisabled();
  await grades.uncheck();
  await expect(save).toBeEnabled();
  // Changing it back is no change.
  await grades.check();
  await expect(save).toBeDisabled();
  await grades.uncheck();
  await save.click();
  await expect(page.getByText('Saved. You still see everything here in the app.')).toBeVisible();
  await expect(grades).not.toBeChecked();
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Grades and feedback on my work')).not.toBeChecked();
});

test('ORG-002, ORG-008, ORG-013, ORG-021: an organisation admin’s fixes', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const tag = Date.now().toString(36).slice(-5);
  const orgName = `Fix Hub ${tag}`;
  await signUpWithEmail(page, 'Fola Admin', unique('fixadmin'));
  await page.goto('/orgs/start?kind=enterprise');
  await page.getByRole('button', { name: 'Yes, set up an organisation' }).click();
  await page.getByLabel('Organisation name').fill(orgName);
  const orgSlug = (await page.locator('span.font-mono').filter({ hasText: '.localhost' }).innerText()).split('.')[0]!;
  await page.getByRole('button', { name: `Create ${orgName}` }).click();
  await expect(page).toHaveURL(/\/app\?created=active/);

  // ORG-021: the weights' Save waits for a change; Reset waits until the weights differ.
  await page.goto('/app/settings/dream-score');
  const save = page.getByRole('button', { name: 'Save weights' });
  const reset = page.getByRole('button', { name: 'Reset to equal weights' });
  await expect(save).toBeDisabled();
  await expect(reset).toBeDisabled();
  const first = page.getByRole('spinbutton').first();
  await first.fill('20');
  await expect(save).toBeEnabled();
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(save).toBeDisabled();

  // ORG-008: taking a role away asks first.
  await page.goto('/app/members');
  const me = page.locator('li').filter({ hasText: 'Fola Admin' });
  await me.getByLabel('Add a role').selectOption({ label: 'Analyst' });
  await me.getByRole('button', { name: 'Add' }).click();
  const removeAnalyst = me.getByRole('button', { name: 'Remove Analyst role' });
  await expect(removeAnalyst).toBeVisible();
  page.once('dialog', (d) => {
    expect(d.message()).toContain('Remove the Analyst role from Fola Admin?');
    void d.dismiss();
  });
  await removeAnalyst.click();
  await expect(removeAnalyst).toBeVisible();
  page.once('dialog', (d) => void d.accept());
  await removeAnalyst.click();
  await expect(removeAnalyst).toHaveCount(0);

  // ORG-013: a class moves from in person to online.
  await page.goto('/app/cohorts');
  await page.getByLabel('Name').fill(`Fix cohort ${tag}`);
  await page.getByLabel('First day of week 1').fill(new Date().toISOString().slice(0, 10));
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+\?created=1/);
  await page.goto(`${page.url().split('?')[0]}?week=1`);
  const inPerson = page.locator('li').filter({ hasText: '· In person' });
  const before = await inPerson.count();
  expect(before).toBeGreaterThan(0);
  // The edited class by its own name ("Edit <title>, week 1"), so the check follows that class.
  const edit = inPerson.first().getByRole('button', { name: /^Edit/ });
  const editName = (await edit.getAttribute('aria-label')) ?? (await edit.innerText()).replace(/\s+/g, ' ').trim();
  // While open the button reads "Close <title>, week 1": match the class's own part.
  const own = editName.replace(/^Edit\s*/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const theClass = page.locator('li').filter({ has: page.getByRole('button', { name: new RegExp(`${own}$`) }) });
  await edit.click();
  const saveClass = theClass.getByRole('button', { name: 'Save class' });
  await expect(saveClass).toBeDisabled();
  await theClass.getByLabel('Where it happens').selectOption('virtual');
  await saveClass.click();
  await expect(theClass).toBeVisible();
  await expect(theClass).toContainText('· Online');
  await expect(theClass).not.toContainText('· In person');
  await expect(page.locator('li').filter({ hasText: '· In person' })).toHaveCount(before - 1);

  // ORG-002: the organisation's own address opens its sign-in page for someone signed out.
  const visitor = await (await browser.newContext()).newPage();
  const port = new URL(WEB_URL).port;
  await visitor.goto(`http://${orgSlug}.localhost:${port}/`);
  await expect(visitor).toHaveURL(new RegExp(`${orgSlug}\\.localhost:${port}/login`));
  await expect(visitor.getByText(new RegExp(orgName)).first()).toBeVisible();
});
