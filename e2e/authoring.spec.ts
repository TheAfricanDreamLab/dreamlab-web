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

  // CAT-4: the lesson is written with forms, block by block; no JSON.
  await page.getByRole('button', { name: /First lesson.*min/ }).click();
  const text = page.getByRole('region', { name: 'Text block 1' });
  await text.getByRole('button', { name: /Write the first step here/ }).click();
  await text.getByLabel('Text', { exact: true }).fill('Every strip starts with the warp. ');
  await text.getByRole('button', { name: 'Bold' }).click();
  await expect(text.getByLabel('Text', { exact: true })).toHaveValue('Every strip starts with the warp. **bold text**');

  await page.getByRole('button', { name: 'Add a block to step 1' }).click();
  await page.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Callout/ }).click();
  const callout = page.getByRole('region', { name: 'Callout block 2' });
  await callout.getByLabel('Heading (optional)').fill('Count twice');
  await callout.getByLabel('Text', { exact: true }).fill('A miscounted warp shows in every strip.');
  await callout.getByRole('tab', { name: 'Preview' }).click();
  await expect(callout.getByRole('complementary', { name: 'Count twice' })).toBeVisible();

  await page.getByRole('button', { name: 'Add a block to step 1' }).click();
  await page.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Multiple choice/ }).click();
  const question = page.getByRole('region', { name: 'Multiple choice block 3' });
  await question.getByLabel('Question').fill('What do you set up first?');
  await question.getByLabel('Answer 1', { exact: true }).fill('The weft');
  await question.getByLabel('Answer 2', { exact: true }).fill('The warp');
  await question.getByLabel('Answer 2 is right').check();
  // A block shows what is wrong with it as you type.
  await question.getByLabel('Explanation').fill('');
  await expect(question.getByText('1 thing to fix')).toBeVisible();
  await question.getByLabel('Explanation').fill('The warp holds the strip together.');
  await expect(question.getByText('1 thing to fix')).toHaveCount(0);

  // Remove a block, then undo it.
  page.once('dialog', (d) => void d.accept());
  await callout.getByRole('button', { name: 'Remove Callout block 2' }).click();
  await expect(page.getByRole('region', { name: 'Callout block 2' })).toHaveCount(0);
  await page.getByRole('button', { name: '↶ Undo' }).click();
  await expect(page.getByRole('region', { name: 'Callout block 2' })).toBeVisible();

  // A quiz offers only questions with a right answer.
  await page.getByLabel('Item title').fill('Check your loom');
  await page.getByLabel('New item').selectOption('quiz');
  await page.getByRole('button', { name: 'Add item' }).click();
  await page.getByRole('button', { name: 'Add a question to the quiz' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose what to add' });
  await expect(picker.getByRole('button', { name: /^Callout/ })).toHaveCount(0);
  await picker.getByRole('button', { name: /^Put in order/ }).click();
  await expect(page.getByRole('region', { name: 'Put in order question 2' })).toBeVisible();

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
