import { expect, test } from '@playwright/test';
import {
  adminCredentials,
  codeCount,
  enterCode,
  latestCode,
  latestInviteLink,
  PASSWORD,
  signedIn,
  signIn,
  signOut,
  signUpWithEmail,
  unique,
} from './helpers';

test.describe('public pages', () => {
  test('landing page leads to sign-up and sign-in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn to build');
    await expect(page.getByRole('heading', { name: 'One platform, every kind of learner.' })).toBeVisible();
    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await page.getByRole('link', { name: 'Sign in' }).last().click();
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('signed-in pages send visitors to sign in and come back afterwards', async ({ page }) => {
    await page.goto('/app/account');
    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Faccount/);
    await page.goto('/orgs/new');
    await expect(page).toHaveURL(/\/orgs\/start$/);
    await expect(page.getByRole('heading', { name: 'Set up your organisation' })).toBeVisible();
  });
});

test.describe('individual learner', () => {
  test.describe.configure({ mode: 'serial' });
  const email = unique('ada');

  test('signs up with email, confirms with a code, lands in the personal space', async ({ page }) => {
    await signUpWithEmail(page, 'Ada Obi', email);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Welcome, Ada.' })).toBeVisible();
    await expect(page.getByText('You’re learning on your own.')).toBeVisible();
    await expect(page.locator('summary').filter({ hasText: 'Just me' })).toBeVisible();
  });

  test('a duplicate sign-up is turned towards sign-in', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Your full name').fill('Ada Again');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Create a password').fill(PASSWORD);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create my account' }).click();
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('already have an account');
  });

  test('signs out and back in with a password; a wrong password is explained', async ({ page }) => {
    await signIn(page, email, 'not-the-password');
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('doesn’t match our records');
    await signIn(page, email);
    await expect(page).toHaveURL(/\/app$/);
    await signOut(page);
  });

  test('signs in with a one-time code instead of a password', async ({ page }) => {
    const before = codeCount(email);
    await page.goto('/login');
    await page.getByRole('link', { name: 'Email me a sign-in code instead' }).click();
    await expect(page).toHaveURL(/\/login\/code/);
    await page.getByLabel('Email or phone').fill(email);
    await page.getByRole('button', { name: 'Send me a code' }).click();
    await expect(page.getByRole('heading', { name: 'Enter your 6-digit code' })).toBeVisible();
    await enterCode(page, '000000');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('isn’t right');
    await enterCode(page, await latestCode(email, before));
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app$/);
  });

  test('resets a forgotten password with a code', async ({ page }) => {
    const before = codeCount(email);
    await page.goto('/forgot-password');
    await page.getByLabel('Email or phone').fill(email);
    await page.getByRole('button', { name: 'Send reset code' }).click();
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await enterCode(page, await latestCode(email, before));
    await page.getByLabel('New password').fill('a-brand-new-password');
    await page.getByLabel('Type it again').fill('a-brand-new-password');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page).toHaveURL(/\/login\?reset=1/);
    await expect(page.getByText('Your password is changed')).toBeVisible();
    await signIn(page, email, 'a-brand-new-password');
    await expect(page).toHaveURL(/\/app$/);
  });

  test('sees devices and changes the password from the account page', async ({ page }) => {
    await signedIn(page, email, 'a-brand-new-password');
    await page.getByRole('link', { name: 'Account' }).click();
    await expect(page.getByRole('heading', { name: 'Your account' })).toBeVisible();
    await expect(page.getByText('This device')).toBeVisible();
    await page.getByLabel('Current password').fill('a-brand-new-password');
    await page.getByLabel('New password').fill(PASSWORD);
    await page.getByLabel('Type the new one again').fill(PASSWORD);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed.')).toBeVisible();
  });

  test('signs up with a Nigerian phone number typed locally', async ({ page }) => {
    const local = `080${String(Date.now()).slice(-8)}`;
    const e164 = `+234${local.slice(1)}`;
    await page.goto('/signup');
    await page.getByLabel('Your full name').fill('Bayo Phone');
    await page.getByRole('tab', { name: 'Phone' }).click();
    await page.getByLabel('Phone number').fill(local);
    await page.getByLabel('Create a password').fill(PASSWORD);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create my account' }).click();
    await expect(page.getByRole('heading', { name: 'Check your messages' })).toBeVisible();
    await expect(page.getByText(e164)).toBeVisible();
    await enterCode(page, await latestCode(e164));
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome, Bayo.' })).toBeVisible();
  });
});

test.describe('organisations', () => {
  test.describe.configure({ mode: 'serial' });
  const ownerEmail = unique('owner');
  const inviteeEmail = unique('invitee');
  const orgName = `Kano Builders ${Date.now().toString(36)}`;
  let orgSlug = '';

  test('a learner signs up a company, which is live at once', async ({ page }) => {
    await signUpWithEmail(page, 'Funmi Owner', ownerEmail);
    await page.goto('/orgs/new');
    await page.getByRole('radio', { name: /A company or team/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Organisation name').fill(orgName);
    orgSlug = (await page.locator('span.font-mono').filter({ hasText: '.localhost' }).innerText()).split('.')[0]!;
    expect(orgSlug).toMatch(/^kano-builders-/);
    await page.getByRole('button', { name: '11-50' }).click();
    await expect(page.getByText('it’s ready the moment you create it')).toBeVisible();
    await page.getByRole('button', { name: `Create ${orgName}` }).click();
    await expect(page).toHaveURL(/\/app\?created=active/);
    await expect(page.getByText('Your organisation is ready.')).toBeVisible();
    await expect(page.locator('summary').filter({ hasText: orgName })).toBeVisible();
    await page.getByRole('link', { name: 'People' }).click();
    await expect(page.getByRole('main').getByText('Funmi Owner')).toBeVisible();
    await expect(page.locator('li').filter({ hasText: 'Funmi Owner' }).getByText('Admin')).toBeVisible();
  });

  test('the admin invites someone, who previews, signs up and joins', async ({ page, browser }) => {
    await signedIn(page, ownerEmail);
    await page.locator('summary').filter({ hasText: /Just me|Kano/ }).first().click();
    await page.getByRole('banner').getByRole('button', { name: new RegExp(orgName) }).click();
    await page.getByRole('link', { name: 'People' }).click();
    await page.getByLabel('Email or phone').fill(inviteeEmail);
    await page.getByRole('radio', { name: /Learner/ }).check();
    await page.getByRole('button', { name: 'Send invitation' }).click();
    await expect(page.getByText(`Invitation sent to ${inviteeEmail}.`)).toBeVisible();
    await expect(page.getByText('Waiting to join')).toBeVisible();

    const link = await latestInviteLink(inviteeEmail);
    const guest = await browser.newContext({ baseURL: 'http://localhost:3100' });
    const invitee = await guest.newPage();
    await invitee.goto(link.replace(/^https?:\/\/[^/]+/, ''));
    await expect(invitee).toHaveURL(/\/invitations\/accept$/); // the token left the URL
    await expect(invitee.getByRole('heading', { name: 'Funmi invited you to join.' })).toBeVisible();
    await expect(invitee.getByText(orgName).first()).toBeVisible();
    await expect(invitee.getByText('What you’ll be able to do')).toBeVisible();
    await invitee.getByRole('link', { name: 'Create my account to accept' }).click();
    await expect(invitee).toHaveURL(/\/signup/);
    await signUpWithEmail(invitee, 'Chidi Invitee', inviteeEmail, PASSWORD, invitee.url());
    await expect(invitee).toHaveURL(/\/invitations\/accept$/);
    await invitee.getByRole('button', { name: 'Accept and join' }).click();
    await expect(invitee).toHaveURL(/\/app\?joined=1/);
    await expect(invitee.getByText('You’ve joined.')).toBeVisible();
    await expect(invitee.locator('summary').filter({ hasText: orgName })).toBeVisible();
    // A learner sees no People page.
    await expect(invitee.getByRole('link', { name: 'People' })).toHaveCount(0);
    await guest.close();

    await page.reload();
    await expect(page.getByText('Chidi Invitee')).toBeVisible();
  });

  test('the organisation’s own site greets people by name', async ({ page }) => {
    await page.goto(`http://${orgSlug}.localhost:3100/login`);
    await expect(page.getByText(new RegExp(`Welcome back · ${orgName}`, 'i'))).toBeVisible();
  });

  test('a school waits for approval, then a platform admin approves it', async ({ page, browser }) => {
    const dean = unique('dean');
    const school = `Lagos Academy ${Date.now().toString(36)}`;
    await signUpWithEmail(page, 'Dean Okoro', dean);
    await page.goto('/orgs/new?kind=institution');
    // The type came with the link, so the wizard opens at the name.
    await page.getByLabel('Organisation name').fill(school);
    await expect(page.getByText(/We check new/)).toBeVisible();
    await page.getByRole('button', { name: `Create ${school}` }).click();
    await expect(page).toHaveURL(/\/app\?created=pending/);
    await expect(page.getByText(/is in review/)).toBeVisible();
    await page.getByRole('link', { name: 'People' }).click();
    await expect(page.getByText('While you’re in review, you can invite co-admins.')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Learner/ })).toHaveCount(0);

    const adminContext = await browser.newContext({ baseURL: 'http://localhost:3100' });
    const admin = await adminContext.newPage();
    const { email, password } = adminCredentials();
    await signedIn(admin, email, password);
    await admin.getByRole('link', { name: 'Organisations' }).click();
    const row = admin.locator('li').filter({ hasText: school });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(admin.locator('li').filter({ hasText: school })).toHaveCount(0);
    await admin.getByRole('link', { name: 'Live' }).click();
    await expect(admin.locator('li').filter({ hasText: school })).toBeVisible();
    await adminContext.close();

    await page.reload();
    await expect(page.getByRole('radio', { name: /Learner/ })).toBeVisible();
  });
});
