import { type Browser, expect, type Locator, type Page, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * ASSIGN-1 assigned learning: an organisation assigns Problem Solving to a member with a due date;
 * the member finds it under Assigned to me, starts it and finishes the first lesson; the
 * organisation sees them in progress. Needs the full local stack with the catalog seeded.
 */

// Lesson helpers, as in learning.spec.ts.
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

async function inviteLearner(page: Page, email: string): Promise<string> {
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByLabel('Email or phone').fill(email);
  await page.getByRole('radio', { name: /Learner/ }).check();
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();
  return (await latestInviteLink(email)).replace(/^https?:\/\/[^/]+/, '');
}

async function join(browser: Browser, link: string, name: string, email: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL });
  const page = await context.newPage();
  await page.goto(link);
  await page.getByRole('link', { name: 'Create my account to accept' }).click();
  await expect(page).toHaveURL(/\/signup/);
  await signUpWithEmail(page, name, email, PASSWORD, page.url());
  await expect(page).toHaveURL(/\/invitations\/accept$/);
  await page.getByRole('button', { name: 'Accept and join' }).click();
  await expect(page).toHaveURL(/\/app\?joined=1/);
  return page;
}

test('an organisation assigns a course with a due date; the member starts it and shows as in progress', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const suffix = Date.now().toString(36).slice(-5);
  const memberEmail = unique('assignee');
  const due = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await createCompany(page, 'Adaeze Admin', unique('admin'), `Assign Co ${suffix}`);
  const link = await inviteLearner(page, memberEmail);
  const member = await join(browser, link, 'Musa Member', memberEmail);

  // The admin assigns Problem Solving to the member.
  await page.goto('/app/assignments');
  await expect(page.getByRole('heading', { name: 'Assigned learning', level: 1 })).toBeVisible();
  await page.getByRole('combobox', { name: 'Course' }).selectOption({ label: 'Problem Solving' });
  await page.getByLabel('Find someone').fill('Musa');
  await page.getByRole('group', { name: 'People' }).getByLabel(/Musa Member/).check();
  await page.getByLabel('Due date').fill(due);
  await page.getByLabel(/Note to the people assigned/).fill('Please finish before the planning retreat.');
  await page.getByRole('button', { name: 'Assign course' }).click();
  await expect(page).toHaveURL(/\/app\/assignments\/[0-9a-f-]{36}\?created=1/);
  const assignmentUrl = page.url().split('?')[0]!;
  await expect(page.getByRole('heading', { name: 'Problem Solving', level: 1 })).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Musa Member' })).toContainText('Not started');

  // The member finds it under Assigned to me and starts it.
  await member.goto('/app/learning');
  const assigned = member.getByRole('region', { name: 'Assigned to me' });
  await expect(assigned).toContainText('Problem Solving');
  await expect(assigned).toContainText(`Assign Co ${suffix}`);
  await expect(assigned).toContainText('Please finish before the planning retreat.');
  await assigned.getByRole('link', { name: /Start/ }).click();
  await expect(member).toHaveURL(/\/learn\/[0-9a-f-]{36}$/);
  // The course home offers the first lesson ("Start the course", or "Continue: …" once opened).
  await member.getByRole('link', { name: /^(Start the course|Continue: )/ }).first().click();
  await expect(member).toHaveURL(/\/learn\/[0-9a-f-]{36}\/[0-9a-f-]{36}$/);
  await finishLesson(member);

  // The organisation sees the member in progress.
  await page.goto(assignmentUrl);
  await expect(page.getByRole('listitem').filter({ hasText: 'Musa Member' })).toContainText('In progress');
});
