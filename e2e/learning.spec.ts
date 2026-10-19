import { expect, type Locator, type Page, test } from '@playwright/test';
import { adminCredentials, PASSWORD, signedIn, signUpWithEmail, unique } from './helpers';

/*
 * Catalogue → course page → sign up → enrol → first lesson → my learning → journal, and the
 * platform admin console. Needs the full local stack with the catalog seeded (Problem Solving).
 */

const REFLECTION =
  'The borehole in our village breaks down every few weeks and families wait for hours to collect water. Children miss the start of school, and the committee has not yet found a fair rota or a way to pay for repairs.';

/** Answer one interactive lesson block until it is settled. Wrong answers are fine: the solution shows after two tries. */
async function settle(block: Locator): Promise<void> {
  const type = await block.getAttribute('data-block-type');
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await block.getAttribute('data-settled')) === 'true') return;
    switch (type) {
      case 'scale':
        await block.getByRole('button', { name: '3', exact: true }).click();
        break;
      case 'poll':
        await block.getByRole('radio').first().check();
        await block.getByRole('button', { name: 'Vote' }).click();
        break;
      case 'reflection':
        await block.getByRole('textbox').fill(REFLECTION);
        await block.getByRole('button', { name: /Save/ }).click();
        break;
      case 'scenario':
        await block.getByRole('button').first().click();
        break;
      default: {
        const retry = block.getByRole('button', { name: 'Try again' });
        if (await retry.isVisible()) await retry.click();
        if (type === 'choice') {
          const inputs = block.locator('input');
          await inputs.nth(attempt % (await inputs.count())).check();
        }
        if (type === 'match') {
          const selects = block.locator('select');
          for (let i = 0; i < (await selects.count()); i++) await selects.nth(i).selectOption({ index: 1 + ((i + attempt) % ((await selects.nth(i).locator('option').count()) - 1)) });
        }
        await block.getByRole('button', { name: 'Check' }).click();
      }
    }
    // Wait for the verdict (or the next try) before looking again.
    await expect(block.getByRole('button', { name: /Checking|Sending|Saving/ })).toHaveCount(0);
    await expect
      .poll(async () => (await block.getAttribute('data-settled')) === 'true' || (await block.getByRole('button', { name: 'Try again' }).isVisible()))
      .toBe(true);
  }
  await expect(block).toHaveAttribute('data-settled', 'true');
}

async function finishLesson(page: Page): Promise<void> {
  for (let step = 0; step < 25; step++) {
    const blocks = page.locator('[data-block-type]');
    for (let i = 0; i < (await blocks.count()); i++) await settle(blocks.nth(i));
    const next = page.getByRole('button', { name: 'Continue', exact: true });
    if (await next.isVisible()) {
      await expect(next).toBeEnabled();
      await next.click();
      continue;
    }
    await page.getByRole('button', { name: 'Complete lesson' }).click();
    return;
  }
  throw new Error('The lesson never reached its last step');
}

test.describe('learning', () => {
  test.describe.configure({ mode: 'serial' });
  const email = unique('learner');

  test('a visitor browses the catalogue and opens Problem Solving', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn the skills');
    await page.getByRole('link', { name: 'Problem Solving', exact: true }).first().click();
    await expect(page).toHaveURL(/\/courses\/problem-solving$/);
    await expect(page.getByRole('heading', { name: 'Problem Solving', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What you’ll learn' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Syllabus' })).toBeVisible();
    await expect(page.getByText('Problem Definition Canvas').first()).toBeVisible();
  });

  test('signs up from the course page, enrols and completes the first lesson', async ({ page }) => {
    await page.goto('/courses/problem-solving');
    await page.getByRole('link', { name: 'Sign up to enrol' }).click();
    await expect(page).toHaveURL(/\/signup\?next=%2Fcourses%2Fproblem-solving/);
    await signUpWithEmail(page, 'Amara Learner', email, PASSWORD, page.url());
    await expect(page).toHaveURL(/\/courses\/problem-solving$/);

    await page.getByRole('button', { name: 'Enrol for free' }).click();
    await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: 'Why problem solving comes first', level: 1 })).toBeVisible();
    const firstItem = page.url();

    await finishLesson(page);
    await expect(page).not.toHaveURL(firstItem);
    await expect(page.getByRole('heading', { name: 'Problem, symptom or solution in disguise?', level: 1 })).toBeVisible();

    // Coming back to a finished lesson shows it as done.
    await page.goto(firstItem);
    await expect(page.getByText('Done', { exact: true }).first()).toBeVisible();
  });

  test('sees progress in My learning and the reflection in the journal', async ({ page }) => {
    await signedIn(page, email);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Learning' }).click();
    await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Problem Solving' })).toBeVisible();
    await expect(page.getByText(/^1 of \d+ done/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue Problem Solving' })).toBeVisible();

    await page.getByRole('link', { name: 'My journal' }).first().click();
    await expect(page.getByRole('heading', { name: 'My journal' })).toBeVisible();
    await expect(page.getByText(REFLECTION)).toBeVisible();

    await page.goto('/app');
    await expect(page.getByRole('heading', { name: 'Continue learning' })).toBeVisible();
  });

  test('the player needs an account', async ({ browser }) => {
    const guest = await browser.newContext({ baseURL: 'http://localhost:3100' });
    const page = await guest.newPage();
    await page.goto('/learn/00000000-0000-4000-8000-000000000000/00000000-0000-4000-8000-000000000000');
    await expect(page).toHaveURL(/\/login\?next=%2Flearn%2F/);
    await guest.close();
  });
});

test.describe('platform admin console', () => {
  test('overview, catalogue switches and people search', async ({ page }) => {
    const { email, password } = adminCredentials();
    await signedIn(page, email, password);
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Platform admin' }).click();
    await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign-ups, last 14 days' })).toBeVisible();
    const admin = page.getByRole('navigation', { name: 'Platform admin' });

    await admin.getByRole('link', { name: 'Catalog' }).click();
    await expect(page.getByRole('heading', { name: 'Catalog', level: 1 })).toBeVisible();
    const featured = page.getByRole('button', { name: 'Featured: Problem Solving' });
    const before = await featured.getAttribute('aria-pressed');
    const flipped = before === 'true' ? 'false' : 'true';
    await featured.click();
    await expect(featured).toHaveAttribute('aria-pressed', flipped);
    await featured.click();
    await expect(featured).toHaveAttribute('aria-pressed', before!);
    await expect(page.getByRole('heading', { name: 'Import a course or programme' })).toBeVisible();

    await admin.getByRole('link', { name: 'People' }).click();
    await page.getByLabel('Search by name, email or phone').fill(email);
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/app\/admin\/users\?q=/);
    const row = page.getByRole('row').filter({ hasText: email });
    await expect(row).toBeVisible();
    await row.getByRole('link').first().click();
    await expect(page.getByRole('heading', { name: 'Ways to sign in' })).toBeVisible();
    await expect(page.getByText('You can’t suspend yourself.')).toBeVisible();
  });
});
