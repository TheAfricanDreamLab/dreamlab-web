import { expect, type Browser, type Page, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signedIn, signIn, signUpWithEmail, switchTo, unique } from './helpers';

/*
 * Where signed-in ends and signed-out begins, and how a person with a personal account joins an
 * organisation without the two getting mixed up.
 */

const BASE = 'http://localhost:3100';

async function freshPage(browser: Browser): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  return { page, close: () => context.close() };
}

async function signOutFromMenu(page: Page): Promise<void> {
  await page.locator('summary').filter({ hasText: /^[A-Z]{1,2}$/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function invite(page: Page, orgName: string, email: string): Promise<string> {
  await page.goto('/app');
  // Sign-in returns people to the organisation they last worked in; switch only if needed.
  if (!(await page.locator('summary').filter({ hasText: orgName }).isVisible())) await switchTo(page, orgName);
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByLabel('Email or phone').fill(email);
  await page.getByRole('radio', { name: /Learner/ }).check();
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();
  return (await latestInviteLink(email)).replace(/^https?:\/\/[^/]+/, '');
}

test.describe('sign-in and sign-out boundary', () => {
  test('signing out ends the session everywhere, and Back does not show a signed-in page', async ({ page }) => {
    await signUpWithEmail(page, 'Bola Boundary', unique('boundary'));
    await page.goto('/app/learning');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await signOutFromMenu(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  });

  test('public pages show the signed-in state and a way to sign out', async ({ page }) => {
    await signUpWithEmail(page, 'Ada Public', unique('public'));
    await page.goto('/courses');
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'My space' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
    await header.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/courses');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('the public site can ask whether this browser is signed in', async ({ page, request }) => {
    expect(await (await request.get('/auth/session')).json()).toEqual({ signedIn: false });
    await signUpWithEmail(page, 'Kemi Session', unique('session'));
    const state = await page.evaluate(async () => (await fetch('/auth/session')).json());
    expect(state).toMatchObject({ signedIn: true, firstName: 'Kemi', initials: 'KS' });
  });

  test('sign-out redirects within the site (never to the server’s internal address)', async ({ request }) => {
    const res = await request.post('/auth/logout', { form: { next: '/login' }, maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers()['location']).toBe('/login');
  });

  test('a session ended elsewhere sends this browser to sign-in, without a redirect loop', async ({ browser }) => {
    const email = unique('twodevices');
    const phone = await freshPage(browser);
    await signUpWithEmail(phone.page, 'Two Devices', email);
    const laptop = await freshPage(browser);
    await signIn(laptop.page, email);
    await expect(laptop.page).toHaveURL(/\/app/);
    // On the phone: sign out everywhere.
    await phone.page.goto('/app/account');
    await phone.page.getByRole('button', { name: 'Sign out everywhere' }).click();
    await expect(phone.page).toHaveURL(/\/login\?signedout=1/);
    // The laptop's next page finds the session over and lands on sign-in.
    await laptop.page.goto('/app/learning');
    await expect(laptop.page).toHaveURL(/\/login/);
    await laptop.page.goto('/app');
    await expect(laptop.page).toHaveURL(/\/login\?next=%2Fapp$/);
    await phone.close();
    await laptop.close();
  });

  test('a link cannot sign anyone out', async ({ page }) => {
    await signUpWithEmail(page, 'Link Safe', unique('linksafe'));
    await page.goto('/auth/logout');
    await page.goto('/app');
    await expect(page).toHaveURL(/\/app$/);
  });
});

test.describe('joining an organisation with a personal account', () => {
  test.describe.configure({ mode: 'serial' });
  const owner = unique('owner');
  const learner = unique('personal');
  const orgName = `Boundary Co ${Date.now().toString(36)}`;
  let link = '';

  test('an admin invites someone who already learns on their own', async ({ page, browser }) => {
    const other = await freshPage(browser);
    await signUpWithEmail(other.page, 'Amina Personal', learner);
    await other.close();
    await createCompany(page, 'Owner Boundary', owner, orgName);
    link = await invite(page, orgName, learner);
  });

  test('signed out, the invitation offers sign-in (the account exists), and joining lands in the organisation', async ({ browser }) => {
    const { page, close } = await freshPage(browser);
    await page.goto(link);
    await expect(page).toHaveURL(/\/invitations\/accept$/);
    await expect(page.getByRole('link', { name: 'Create my account to accept' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Sign in to accept' }).click();
    await page.getByLabel('Email or phone').fill(learner);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/invitations\/accept$/);
    await page.getByRole('button', { name: 'Accept and join' }).click();
    await expect(page).toHaveURL(/\/app\?joined=1/);
    await expect(page.locator('summary').filter({ hasText: orgName })).toBeVisible();
    await close();
  });

  test('the next sign-in returns to the organisation; choosing "Just me" is remembered too', async ({ browser }) => {
    const { page, close } = await freshPage(browser);
    await signIn(page, learner);
    await expect(page).toHaveURL(/\/app/);
    await expect(page.locator('summary').filter({ hasText: orgName })).toBeVisible();
    await switchTo(page, 'Just me');
    await signOutFromMenu(page);
    await signIn(page, learner);
    await expect(page.locator('summary').filter({ hasText: /Just me/ })).toBeVisible();
    await close();
  });

  test('signed in as someone else, the invitation says so and lets you switch accounts', async ({ page, browser }) => {
    const invitee = unique('second');
    const second = await freshPage(browser);
    await signUpWithEmail(second.page, 'Second Person', invitee);
    await second.close();
    await signedIn(page, owner);
    const secondLink = await invite(page, orgName, invitee);
    // The owner is still signed in and opens the invitation meant for someone else.
    await page.goto(secondLink);
    await expect(page.getByText(/This invitation is for/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept and join' })).toHaveCount(0);
    await page.getByRole('button', { name: /Sign out and continue as/ }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Finvitations%2Faccept$/);
    await page.getByLabel('Email or phone').fill(invitee);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/invitations\/accept$/);
    await expect(page.getByRole('button', { name: 'Accept and join' })).toBeVisible();
  });

  test('on an organisation’s own site, a member works in it and a non-member is told so', async ({ browser }) => {
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const member = await freshPage(browser);
    await member.page.goto(`http://${slug}.localhost:3100/login`);
    await member.page.getByLabel('Email or phone').fill(learner);
    await member.page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await member.page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(member.page.locator('summary').filter({ hasText: orgName })).toBeVisible();
    await member.close();

    const outsider = await freshPage(browser);
    const stranger = unique('stranger');
    await outsider.page.goto(`http://${slug}.localhost:3100/signup`);
    await signUpWithEmail(outsider.page, 'Not A Member', stranger, PASSWORD, `http://${slug}.localhost:3100/signup`);
    await outsider.page.goto(`http://${slug}.localhost:3100/app`);
    await expect(outsider.page).toHaveURL(/\/app\/no-access\?org=/);
    await expect(outsider.page.getByRole('heading', { name: new RegExp(`You’re not in ${orgName}`) })).toBeVisible();
    await outsider.close();
  });
});
