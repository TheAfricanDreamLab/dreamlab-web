import { expect, test } from '@playwright/test';
import { createCompany, signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * Slice 3 outcomes: a learner writes a Dream Residency stage and submits it; faculty approve it with
 * a score and the credits count; the learner's action plan is submitted and approved; faculty confirm
 * every graduation requirement and graduate the learner; the credential checks out publicly and the
 * shared portfolio opens signed out. Needs the full local stack with the catalog seeded.
 */

const long = (n: number, seed: string) => Array.from({ length: Math.ceil(n / seed.length) + 1 }, () => seed).join(' ').slice(0, n + 20);

test('a learner’s residency, action plan and graduation, checked publicly', async ({ page, browser }) => {
  test.setTimeout(300_000);
  const cohortName = `Cohort ${Date.now().toString(36).slice(-5)}`;
  const learnerName = 'Nkem Learner';

  // The host schedules a cohort open to anyone signed in.
  await createCompany(page, 'Halima Host', unique('host'), `Hub ${cohortName}`);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cohorts' }).click();
  await page.getByLabel('Name').fill(cohortName);
  await page.getByLabel('First day of week 1').fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel('Who can join').selectOption('open');
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+\?created=1/);
  await page.getByRole('button', { name: 'Open for joining' }).click();
  await expect(page.getByText('Open to join', { exact: true })).toBeVisible();
  const cohortUrl = page.url().split('?')[0]!;

  // A learner joins and writes the first residency stage.
  const learner = await (await browser.newContext()).newPage();
  await signUpWithEmail(learner, learnerName, unique('nkem'));
  await learner.goto('/programs/the-african-dream-lab');
  await learner.getByRole('button', { name: `Join ${cohortName}` }).click();
  await expect(learner).toHaveURL(/\/app\/programme\?joined=/);
  await learner.getByRole('link', { name: 'Dream Residency' }).first().click();
  await expect(learner.getByRole('heading', { name: 'Dream Residency', level: 1 })).toBeVisible();
  await expect(learner.getByRole('heading', { name: 'Dream Definition', level: 2 })).toBeVisible();
  await learner.getByLabel('Dream Statement').fill(long(260, 'Every smallholder in my district dries grain without losing a third of it to damp.'));
  await learner.getByRole('button', { name: 'Add a link' }).click();
  await learner.getByLabel('Link 1 name').fill('Interview notes');
  await learner.getByLabel('Link 1 address').fill('https://docs.example.org/interviews');
  await learner.getByRole('button', { name: 'Save draft' }).click();
  await expect(learner.getByText('Draft saved.')).toBeVisible();
  await learner.getByRole('button', { name: 'Submit for review' }).click();
  await expect(learner.getByText(/^Submitted\./)).toBeVisible();
  await expect(learner.getByRole('link', { name: /Dream Definition/ })).toContainText('With faculty');

  // Faculty approve it with a score from the residency board; its five credits count.
  await page.goto(cohortUrl);
  await page.getByRole('link', { name: 'Residency board' }).click();
  await expect(page.getByRole('heading', { name: 'Residency board', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: learnerName, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review this stage' })).toBeVisible();
  await page.getByLabel('Score (0–100)').fill('86');
  await page.getByLabel('Feedback for the learner').fill('A clear, specific dream statement backed by real interviews.');
  await page.getByRole('button', { name: 'Approve stage' }).click();
  await expect(page.getByText(/^Approved at 86%/)).toBeVisible();
  await learner.reload();
  await expect(learner.getByText('5.0 of 45.0 credits')).toBeVisible();

  // The learner's action plan, submitted and approved.
  await learner.getByRole('link', { name: 'Action plan' }).first().click();
  await learner.getByLabel('Where you will be in twelve months').fill(long(120, 'A solar drying service in three districts, paying for itself by month nine.'));
  for (const [i, text] of ['First ten paying farmers', 'Second dryer built', 'Break even'].entries()) {
    await learner.getByLabel('Milestone', { exact: true }).nth(i).fill(text);
    await learner.getByLabel('How you will measure it').nth(i).fill('Sales records');
  }
  await learner.getByLabel('What you need (people, money, tools)').fill('Two dryers, a motorbike and a bookkeeper.');
  await learner.getByLabel('The biggest risks, and what you will do about them').fill('A poor harvest; a competitor copying the design.');
  await learner.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(learner.getByText('Submitted for approval.')).toBeVisible();

  await page.goto(`${cohortUrl}/graduation`);
  await page.getByRole('link', { name: new RegExp(learnerName) }).click();
  await page.getByRole('navigation', { name: 'Programme outcomes' }).getByRole('link', { name: 'Action plan' }).click();
  await page.getByLabel('Feedback for the learner').fill('A realistic plan with measurable milestones.');
  await page.getByRole('button', { name: 'Approve plan' }).click();
  await expect(page.getByText('Action plan approved.')).toBeVisible();

  // Faculty confirm every requirement, then graduate the learner.
  await page.getByRole('navigation', { name: 'Programme outcomes' }).getByRole('link', { name: 'Graduation' }).click();
  await expect(page.getByRole('heading', { name: `${learnerName}’s graduation`, level: 1 })).toBeVisible();
  const confirmButtons = page.getByRole('button', { name: /^Confirm\b/ });
  const toConfirm = await confirmButtons.count();
  expect(toConfirm).toBe(10);
  for (let left = toConfirm; left > 0; left--) {
    await confirmButtons.first().click();
    await expect(confirmButtons).toHaveCount(left - 1);
  }
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: `Graduate ${learnerName}` }).click();
  const credentialLink = page.getByRole('link', { name: /^DL-[A-Z0-9-]+$/ });
  await expect(credentialLink).toBeVisible();
  const code = (await credentialLink.textContent())!.trim();

  // Anyone can check the credential, signed out.
  const visitor = await (await browser.newContext({ baseURL: WEB_URL })).newPage();
  await visitor.goto(`/verify/${code}`);
  await expect(visitor.getByText('Valid', { exact: true })).toBeVisible();
  await expect(visitor.getByText(learnerName)).toBeVisible();
  await visitor.goto('/verify/check');
  await visitor.getByLabel('Credential code').fill(code.toLowerCase());
  await visitor.getByRole('button', { name: 'Check credential' }).click();
  await expect(visitor).toHaveURL(new RegExp(`/verify/${code}$`));

  // The learner publishes their portfolio; it opens signed out, and stops when unpublished.
  await learner.goto('/app/programme');
  await learner.getByRole('link', { name: 'Portfolio' }).first().click();
  await learner.getByRole('button', { name: 'Publish at a link' }).click();
  const shared = learner.locator('span.font-mono').filter({ hasText: '/portfolios/' });
  await expect(shared).toBeVisible();
  const url = new URL((await shared.textContent())!.trim());
  await visitor.goto(url.pathname);
  await expect(visitor.getByRole('heading', { name: learnerName, level: 1 })).toBeVisible();
  await expect(visitor.getByRole('heading', { name: 'Dream Residency', level: 2 })).toBeVisible();
  await learner.getByRole('button', { name: 'Stop sharing' }).click();
  await expect(learner.getByText(/private again/)).toBeVisible();
  const gone = await visitor.goto(url.pathname);
  expect(gone?.status()).toBe(404);
});
