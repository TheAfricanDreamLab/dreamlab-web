import { expect, test } from '@playwright/test';
import { createCompany, signUpWithEmail, unique } from './helpers';

/*
 * ADM-1 admissions: an organisation opens an admission cycle, an applicant completes the six
 * applicant stages, and the organisation's admissions staff interview, award a scholarship, review
 * and admit them. Needs the full local stack with the admissions service and the catalog seeded.
 */

const long = (n: number, seed: string) => Array.from({ length: Math.ceil(n / seed.length) + 1 }, () => seed).join(' ').slice(0, n + 20);

test('an organisation runs an admission cycle; an applicant applies through six stages and is admitted', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const tag = Date.now().toString(36).slice(-5);
  const cycleName = `Intake ${tag}`;

  // The organisation's admin creates a cycle (a draft) and opens it.
  await createCompany(page, 'Amina Admissions', unique('admissions'), `Academy ${tag}`);
  await page.goto('/app/admissions');
  await expect(page.getByRole('heading', { name: 'Admissions', level: 1 })).toBeVisible();
  await page.getByLabel('Name').fill(cycleName);
  await page.getByRole('button', { name: 'Create cycle' }).click();
  await expect(page).toHaveURL(/\/app\/admissions\/cycles\/[0-9a-f-]+\?created=1/);
  await expect(page.getByText('Cycle created as a draft')).toBeVisible();
  await page.getByRole('button', { name: 'Open for applications' }).click();
  await expect(page.getByText('Open', { exact: true })).toBeVisible();

  // An applicant finds the cycle and works through their stages.
  const applicantContext = await browser.newContext();
  const applicant = await applicantContext.newPage();
  await signUpWithEmail(applicant, 'Bola Builder', unique('bola'));
  await applicant.goto('/app/apply');
  await applicant.getByRole('button', { name: `Apply to ${cycleName}` }).click();
  await expect(applicant).toHaveURL(/\/app\/apply\/[0-9a-f-]+$/);
  const applicationUrl = applicant.url();
  const submit = () => applicant.getByRole('button', { name: /^Submit/ }).click();

  // Eligibility: submitting without the confirmations is refused, and nothing moves on.
  await applicant.getByLabel('Country you live in').fill('Nigeria');
  await applicant.getByLabel('Highest education').selectOption('undergraduate');
  await submit();
  await expect(applicant.getByText('Applicants must be 18 or older')).toBeVisible();
  await applicant.getByLabel('I am 18 or older.').check();
  await applicant.getByLabel(/commit to the programme full-time/).check();
  await applicant.getByLabel(/laptop or phone and internet/).check();
  await submit();

  await expect(applicant.getByRole('heading', { name: 'Application', level: 2 })).toBeVisible();
  await applicant.getByLabel('City or town').fill('Abuja');
  await applicant.getByLabel('What you do now').fill('Agronomist');
  await applicant.getByLabel('Why are you applying?').fill(long(120, 'I want to turn my crop dryer into a business that serves my whole district.'));
  await applicant.getByLabel('How did you hear about the programme?').fill('A friend');
  // A draft keeps what was typed.
  await applicant.getByRole('button', { name: 'Save draft' }).click();
  await expect(applicant.getByText('Draft saved.')).toBeVisible();
  await submit();

  await expect(applicant.getByRole('heading', { name: 'Dream Application', level: 2 })).toBeVisible();
  await applicant.getByLabel('What is your dream?').fill(long(90, 'Every smallholder in Kaduna dries grain without losing a third of it.'));
  await applicant.getByLabel('What problem does it solve?').fill(long(90, 'Post-harvest losses from damp storage ruin grain and income.'));
  await applicant.getByLabel('Who benefits?').fill(long(45, 'Smallholder farmers and their families.'));
  await applicant.getByLabel('Why are you the person to build it?').fill(long(90, 'I built the first dryer myself and sold twelve to neighbours.'));
  await submit();

  await expect(applicant.getByRole('heading', { name: 'Evidence of Action', level: 2 })).toBeVisible();
  await applicant.getByLabel('What it is').fill('Solar grain dryer');
  await applicant.getByLabel('What you did and what happened').fill('Built from scrap and sold twelve units to farmers in my village.');
  await submit();

  await expect(applicant.getByRole('heading', { name: 'Builder Assessment', level: 2 })).toBeVisible();
  const prompts = applicant.locator('form textarea');
  for (let i = 0; i < 5; i++) await prompts.nth(i).fill(long(70, `My answer ${i + 1}, with what I did and what happened next.`));
  await submit();

  await expect(applicant.getByRole('heading', { name: 'Video', level: 2 })).toBeVisible();
  await applicant.getByLabel('Link to your video').fill('https://video.example.com/my-pitch');
  await applicant.getByRole('button', { name: 'Submit my application' }).click();
  await expect(applicant.getByText('Your application is complete and with the admissions team.')).toBeVisible();
  await expect(applicant.getByText('Under review', { exact: true })).toBeVisible();

  // Staff take it through interview, scholarship, committee and decision.
  await page.goto(applicationUrl.replace('/app/apply/', '/app/admissions/applications/'));
  await expect(page.getByRole('heading', { name: 'Bola Builder', level: 1 })).toBeVisible();
  const inThreeDays = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel('Interview date and time').fill(`${inThreeDays}T10:00`);
  await page.getByLabel('Interview notes (staff only)').fill('Strong on evidence.');
  await page.getByRole('button', { name: 'Save interview' }).click();
  await expect(page.getByText('Interview saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Move to Scholarship Review' }).click();
  await expect(page.getByRole('button', { name: 'Move to Committee' })).toBeVisible();

  await page.getByLabel('Scholarship (%)').fill('50');
  await page.getByLabel('Reason (staff only)', { exact: true }).fill('Need shown');
  await page.getByRole('button', { name: 'Record scholarship' }).click();
  await expect(page.getByText('Scholarship recorded.')).toBeVisible();
  await page.getByRole('button', { name: 'Move to Committee' }).click();
  await expect(page.getByRole('button', { name: 'Move to Decision' })).toBeVisible();

  for (const [dimension, score] of [
    ['Clarity of the dream', 5],
    ['Insight into the problem', 4],
    ['Evidence of action', 5],
    ['Builder mindset', 4],
    ['Commitment', 5],
    ['Communication', 3],
  ] as const) {
    await page.getByLabel(`${dimension}: ${score}`).check({ force: true });
  }
  await page.getByLabel('Why', { exact: true }).fill('Built and sold a working product already.');
  await page.getByRole('button', { name: 'Save review' }).click();
  await expect(page.getByText('Review saved.')).toBeVisible();
  await expect(page.getByText('DBPI 83 · DSI 83').first()).toBeVisible();
  await page.getByRole('button', { name: 'Move to Decision' }).click();

  await page.getByRole('combobox', { name: 'Decision' }).selectOption('admitted');
  await page.getByLabel('Reason for the decision (staff only)').fill('Committee agreed');
  await page.getByRole('button', { name: 'Record decision' }).click();
  // Once decided, the form gives way to the recorded decision.
  await expect(page.getByRole('status').filter({ hasText: /^Admitted by .*: Committee agreed$/ })).toBeVisible();

  // The applicant sees the outcome and their award, never the staff notes.
  await applicant.reload();
  await expect(applicant.getByText('Congratulations: you have a place.')).toBeVisible();
  await expect(applicant.getByText('You have been awarded a 50% scholarship.')).toBeVisible();
  await expect(applicant.getByText('Committee agreed')).toHaveCount(0);
  await applicantContext.close();
});
