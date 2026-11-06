import { expect, test } from '@playwright/test';
import { createCompany, unique } from './helpers';

/*
 * CAT-3: an organisation admin (author and reviewer of their own organisation's courses) writes a new
 * course in the browser, sends it for review, publishes it, and opens it. Needs the full local stack.
 */

test('an organisation writes a course in the browser, reviews it and publishes it', async ({ page }) => {
  test.setTimeout(180_000);
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

  // CAT-5: a new course starts with a short setup.
  await page.getByLabel('Subtitle', { exact: true }).fill('Strip weaving on a narrow loom');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('How master weavers set up the loom and read a pattern.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('What learners will be able to do').fill('Warp a narrow-strip loom\nRead a simple pattern');
  await page.getByLabel('Who it is for').fill('Apprentices and curious beginners');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Module title').fill('Setting up the loom');
  await page.getByLabel('First lesson title').fill('Warping the loom');
  await page.getByRole('button', { name: 'Start writing' }).click();

  // The workspace: the outline beside the editor, the first lesson open.
  const outline = page.getByRole('navigation', { name: 'Course outline' });
  await expect(outline.getByRole('button', { name: /Setting up the loom/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue('Warping the loom');

  // A discussion, added from the module's menu.
  await outline.getByRole('button', { name: 'Module 1 actions' }).click();
  await page.getByRole('menuitem', { name: 'Add a discussion' }).click();
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Reading a pattern');
  await page.getByRole('textbox', { name: 'Prompt', exact: true }).fill('Which pattern from your town would you weave first, and why?');
  await expect(outline.getByRole('button', { name: /Reading a pattern/ }).first()).toBeVisible();

  // The lesson is written with forms, block by block: text with formatting as you see it.
  await outline.getByRole('button', { name: /Warping the loom/ }).first().click();
  const text = page.getByRole('region', { name: 'Text block 1' });
  await text.getByRole('button', { name: /Write the first step here/ }).click();
  const body = text.getByRole('textbox', { name: 'Text', exact: true });
  await body.fill('Every strip starts with the warp.');
  await body.press('Control+a');
  await text.getByRole('button', { name: 'Bold (Ctrl+B)' }).click();
  await expect(body.locator('strong', { hasText: 'Every strip starts with the warp.' })).toBeVisible();

  await page.getByRole('button', { name: 'Add a block to step 1' }).click();
  await page.getByRole('dialog', { name: 'Choose what to add' }).getByRole('button', { name: /^Callout/ }).click();
  const callout = page.getByRole('region', { name: 'Callout block 2' });
  await callout.getByLabel('Heading (optional)').fill('Count twice');
  await callout.getByRole('textbox', { name: 'Text', exact: true }).fill('A miscounted warp shows in every strip.');
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
  const explanation = question.getByRole('textbox', { name: 'Explanation', exact: true });
  await explanation.fill('');
  await expect(question.getByText('1 thing to fix')).toBeVisible();
  await explanation.fill('The warp holds the strip together.');
  await expect(question.getByText('1 thing to fix')).toHaveCount(0);

  // Remove a block from its menu, then undo it.
  page.once('dialog', (d) => void d.accept());
  await callout.getByRole('button', { name: 'Callout block 2 actions' }).click();
  await page.getByRole('menuitem', { name: 'Remove…' }).click();
  await expect(page.getByRole('region', { name: 'Callout block 2' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Callout block 2' })).toBeVisible();

  // The live preview shows the lesson as learners see it.
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByLabel('Live preview').getByText('Every strip starts with the warp.')).toBeVisible();
  await page.getByRole('button', { name: 'Close the preview' }).click();

  // A quiz offers only questions with a right answer.
  await outline.getByRole('button', { name: 'Module 1 actions' }).click();
  await page.getByRole('menuitem', { name: 'Add a quiz' }).click();
  await page.getByRole('button', { name: 'Add a question to the quiz' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose what to add' });
  await expect(picker.getByRole('button', { name: /^Callout/ })).toHaveCount(0);
  await picker.getByRole('button', { name: /^Put in order/ }).click();
  await expect(page.getByRole('region', { name: 'Put in order question 2' })).toBeVisible();

  // Changes save on their own; Ctrl+S saves straight away and keeps a checkpoint.
  await expect(page.getByText('Saved just now')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Control+s');
  await expect(page.getByText('Saved. Ready to send for review.')).toBeVisible();
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByRole('complementary', { name: 'Version history' }).getByText('Current')).toBeVisible();
  await page.getByRole('button', { name: 'Close version history' }).click();
  await page.getByRole('button', { name: 'Send for review' }).click();
  await expect(page.getByText('Sent for review.')).toBeVisible();
  await expect(page.getByText('In review', { exact: true })).toBeVisible();

  // The organisation admin also reviews: publish.
  await page.getByLabel('Note to the authors').fill('Lovely first course.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText('Published as version 1.').first()).toBeVisible();
  await page.getByRole('link', { name: 'Open the course page' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();

  // The course is listed for editing, with no open draft.
  await page.goto('/app/authoring');
  await expect(page.getByRole('button', { name: `Edit ${title}` })).toBeVisible();
});
