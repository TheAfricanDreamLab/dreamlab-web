import { expect, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signUpWithEmail, unique } from './helpers';

/*
 * ADM-1 staffing: an organisation gives someone the Admissions officer role. They review the
 * organisation's admission cycles but cannot run them. Custom roles can carry the admissions
 * permissions too.
 */
test('an admin invites an Admissions officer, who reviews cycles without running them', async ({ page, browser }) => {
  test.setTimeout(180_000);
  const tag = Date.now().toString(36).slice(-5);
  const cycleName = `Intake ${tag}`;
  const officerEmail = unique('officer');

  await createCompany(page, 'Amina Admissions', unique('admissionsadmin'), `Officer Academy ${tag}`);
  await page.goto('/app/admissions');
  await page.getByLabel('Name').fill(cycleName);
  await page.getByRole('button', { name: 'Create cycle' }).click();
  await expect(page).toHaveURL(/\/app\/admissions\/cycles\/[0-9a-f-]+\?created=1/);

  // The role is offered when inviting someone.
  await page.goto('/app/members');
  await page.getByLabel('Email or phone').fill(officerEmail);
  await page.getByRole('radio', { name: /^Admissions officer/ }).check();
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${officerEmail}.`)).toBeVisible();

  const officer = await (await browser.newContext()).newPage();
  await officer.goto((await latestInviteLink(officerEmail)).replace(/^https?:\/\/[^/]+/, ''));
  await expect(officer.getByText('Read and score applications, run interviews')).toBeVisible();
  await officer.getByRole('link', { name: 'Create my account to accept' }).click();
  await expect(officer).toHaveURL(/\/signup/);
  await signUpWithEmail(officer, 'Olu Officer', officerEmail, PASSWORD, officer.url());
  await expect(officer).toHaveURL(/\/invitations\/accept$/);
  await officer.getByRole('button', { name: 'Accept and join' }).click();
  await expect(officer).toHaveURL(/\/app\?joined=1/);

  // Admissions is in their menu; they see the cycle but not the controls that run it.
  await officer.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admissions' }).click();
  await expect(officer.getByRole('heading', { name: 'Admissions', level: 1 })).toBeVisible();
  await expect(officer.getByRole('link', { name: new RegExp(cycleName) })).toBeVisible();
  await expect(officer.getByRole('heading', { name: 'New cycle' })).toHaveCount(0);
  await officer.getByRole('link', { name: new RegExp(cycleName) }).click();
  await expect(officer.getByRole('button', { name: 'Open for applications' })).toHaveCount(0);

  // A custom role can carry admissions permissions.
  await page.goto('/app/roles');
  await page.getByLabel('Role name').fill(`Interviewer ${tag}`);
  await page.getByLabel('Read and score applications, run interviews').check();
  await page.getByRole('button', { name: 'Create role' }).click();
  const role = page.locator('details').filter({ hasText: `Interviewer ${tag}` });
  await expect(role).toBeVisible();
  await role.getByText(`Interviewer ${tag}`).click();
  await expect(role.getByText(/Read and score applications, run interviews/)).toBeVisible();
});
