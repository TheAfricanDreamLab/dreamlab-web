import { expect, type Page, test } from '@playwright/test';
import { adminCredentials, signedIn, signIn, signUpWithEmail, unique } from './helpers';

/*
 * PLT-2: a platform admin suspends someone for a while, then bans them, then reinstates them.
 * Each time the person is signed out at once and the sign-in page says why. Needs the local stack.
 */

async function openPerson(page: Page, email: string): Promise<void> {
  await page.goto(`/app/admin/users?q=${encodeURIComponent(email)}`);
  await page.getByRole('row').filter({ hasText: email }).getByRole('link').first().click();
  await expect(page.getByRole('heading', { name: 'Account standing' })).toBeVisible();
}

test('suspend for a week, ban, then reinstate: the person is told why at sign-in', async ({ browser }) => {
  const email = unique('standing');
  const learnerCtx = await browser.newContext();
  const learner = await learnerCtx.newPage();
  await signUpWithEmail(learner, 'Tunde Bakare', email);
  await expect(learner).not.toHaveURL(/\/signup|\/verify/);

  const adminCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  const { email: adminEmail, password } = adminCredentials();
  await signedIn(admin, adminEmail, password);
  await openPerson(admin, email);

  // Suspend for a week, with a message.
  await admin.getByLabel('Suspend').check();
  await admin.getByLabel('For how long').selectOption({ label: '1 week' });
  await admin.getByLabel('Reason (for the audit trail)').fill('Spam in three discussions');
  await admin.getByLabel(/Message to Tunde/).fill('Please read the community guidelines.');
  await admin.getByRole('button', { name: 'Suspend Tunde' }).click();
  await expect(admin.getByText(/Tunde Bakare is suspended until .+ and signed out everywhere\. We’ve emailed them\./)).toBeVisible();
  await expect(admin.getByText(/^Suspended to /).first()).toBeVisible();
  await expect(admin.getByText('Spam in three discussions')).toBeVisible();

  // Their session has ended; signing in says why and until when.
  await learner.goto('/app');
  await expect(learner).toHaveURL(/\/login/);
  await signIn(learner, email);
  await expect(learner.getByText(/This account is suspended until \d{1,2} \w+ \d{4}\. Message from the platform team: “Please read the community guidelines\.”/)).toBeVisible();

  // Ban: the standing changes and the people list can filter for it.
  await admin.reload();
  await admin.getByLabel('Ban').check();
  await admin.getByLabel('Reason (for the audit trail)').fill('Repeated spam after a warning');
  await admin.getByLabel('Email Tunde about it').uncheck();
  await admin.getByRole('button', { name: 'Ban Tunde' }).click();
  await expect(admin.getByText('Tunde Bakare is banned and signed out everywhere.')).toBeVisible();
  await admin.goto(`/app/admin/users?status=banned&q=${encodeURIComponent(email)}`);
  await expect(admin.getByRole('row').filter({ hasText: email }).getByText('Banned')).toBeVisible();
  await signIn(learner, email);
  await expect(learner.getByText(/This account has been closed for breaking the platform’s rules\./)).toBeVisible();

  // Reinstate: they can sign in again.
  await openPerson(admin, email);
  await admin.getByLabel('Reason (for the audit trail)').fill('Appeal accepted');
  await admin.getByRole('button', { name: 'Reinstate Tunde' }).click();
  await expect(admin.getByText('Tunde Bakare can sign in again. We’ve emailed them.')).toBeVisible();
  await signedIn(learner, email);

  await learnerCtx.close();
  await adminCtx.close();
});
