import { expect, test } from '@playwright/test';
import { createCompany, unique } from './helpers';

/*
 * CAT-3: an organisation admin (author and reviewer of their own organisation's courses) writes a new
 * course in the browser, sends it for review, publishes it, and opens it. Needs the full local stack.
 */

test('an organisation writes a course in the browser, reviews it and publishes it', async ({ page }) => {
  test.setTimeout(120_000);
  const suffix = Date.now().toString(36).slice(-5);
  const title = `Kente Weaving ${suffix}`;
  await createCompany(page, 'Kofi Owner', unique('kente'), `Kente Guild ${suffix}`);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Authoring' }).click();
  await expect(page.getByRole('heading', { name: 'Authoring', level: 1 })).toBeVisible();
  await page.getByLabel('Course title').fill(title);
  await expect(page.getByLabel('Web address')).toHaveValue(`kente-weaving-${suffix}`);
  await page.getByRole('button', { name: 'Start writing' }).click();
  await expect(page).toHaveURL(/\/app\/authoring\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

  // Details.
  await page.getByLabel('Subtitle', { exact: true }).fill('Strip weaving on a narrow loom');
  await page.getByLabel('Description', { exact: true }).fill('How master weavers set up the loom and read a pattern.');
  await page.getByLabel('What learners will be able to do').fill('Warp a narrow-strip loom\nRead a simple pattern');
  await page.getByLabel('Who it is for').fill('Apprentices and curious beginners');

  // Outline: one module, which starts with a lesson.
  await page.getByRole('button', { name: /^Outline & content/ }).click();
  await page.getByLabel('New module').fill('Setting up the loom');
  await page.getByRole('button', { name: 'Add module' }).click();
  await expect(page.getByLabel('Module title')).toHaveValue('Setting up the loom');
  await page.getByLabel('Item title').fill('Reading a pattern');
  await page.getByLabel('New item').selectOption('discussion');
  await page.getByRole('button', { name: 'Add item' }).click();
  await expect(page.getByLabel('Prompt')).toBeVisible();
  await page.getByLabel('Prompt').fill('Which pattern from your town would you weave first, and why?');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved. Ready to send for review.')).toBeVisible();
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('Sent for review.')).toBeVisible();
  await expect(page.getByText('In review', { exact: true })).toBeVisible();

  // The organisation admin also reviews: publish.
  await page.getByLabel('Note to the authors').fill('Lovely first course.');
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Published as version 1.').first()).toBeVisible();
  await page.getByRole('link', { name: 'Open the course page' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

  // The course is listed for editing, with no open draft.
  await page.goto('/app/authoring');
  await expect(page.getByRole('button', { name: `Edit ${title}` })).toBeVisible();
});
