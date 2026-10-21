import { expect, test } from '@playwright/test';
import { FakeIdp } from './fake-idp';
import { createCompany, latestCode, PASSWORD, signedIn, signOut, signUpWithEmail, switchTo, totp, unique, WEB_URL } from './helpers';

/*
 * Enterprise identity in the browser. Needs the local API with DOMAIN_VERIFY_MODE=trust (domains
 * verify without DNS) and SSO_ALLOW_PRIVATE_URLS=true (the fake identity provider runs on 127.0.0.1).
 */

const stamp = Date.now().toString(36);

test.describe('bringing an organisation', () => {
  test('a visitor learns the order of things, creates an account, and lands in the wizard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Set up your team' }).click();
    await expect(page).toHaveURL(/\/orgs\/start\?kind=enterprise/);
    await expect(page.getByRole('heading', { name: 'Set up your company or team' })).toBeVisible();
    await page.getByRole('link', { name: 'Create my account' }).click();
    await expect(page.getByText('Step 1 of 3 · Your own account')).toBeVisible();

    const email = unique('starter');
    await page.getByLabel('Your full name').fill('Tola Starter');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Create a password').fill(PASSWORD);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create my account' }).click();
    await expect(page).toHaveURL(/\/verify/);
    const { enterCode } = await import('./helpers');
    await enterCode(page, await latestCode(email));
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    // Back to the organisations route: a deliberate confirmation, then naming it with the type already chosen.
    await expect(page).toHaveURL(/\/orgs\/start\?kind=enterprise/);
    await expect(page.getByRole('heading', { name: 'Set up an organisation?' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /A company or team/ })).toBeChecked();
    await page.getByRole('button', { name: 'Yes, set up an organisation' }).click();
    await expect(page).toHaveURL(/\/orgs\/new\?from=start&kind=enterprise/);
    await expect(page.getByLabel('Organisation name')).toBeVisible();
  });
});

test.describe('two-step sign-in', () => {
  test.describe.configure({ mode: 'serial' });
  const email = unique('mfa');
  let secret = '';

  test('adds an authenticator app and keeps the recovery codes', async ({ page }) => {
    await signUpWithEmail(page, 'Mfa Person', email);
    await page.goto('/app/account');
    await page.getByRole('button', { name: 'Set up an authenticator app' }).click();
    secret = (await page.getByTestId('totp-secret').innerText()).trim();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    await expect(page.getByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible();
    await page.getByLabel('Code from the app').fill(totp(secret, -1));
    await page.getByRole('button', { name: 'Turn on two-step sign-in' }).click();
    await expect(page.getByText('Two-step sign-in is on.')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Recovery codes' }).getByRole('listitem')).toHaveCount(10);
  });

  test('sign-in asks for the code after the password', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/login\/mfa/);
    await expect(page.getByRole('heading', { name: 'One more step' })).toBeVisible();
    await page.getByLabel('6-digit code').fill('000000');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('[role=alert]:not(#__next-route-announcer__)')).toContainText('isn’t right');
    await page.getByLabel('6-digit code').fill(totp(secret));
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/app$/);
    await signOut(page);
  });

  async function signIn(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.getByLabel('Email or phone').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
});

test.describe('company sign-in and security', () => {
  test.describe.configure({ mode: 'serial' });
  const idp = new FakeIdp();
  const domain = `co${stamp}.test`;
  const founder = `founder@${domain}`;
  const company = `Okafor Logistics ${stamp}`;

  test.beforeAll(async () => idp.start());
  test.afterAll(() => idp.stop());

  test('an admin verifies the email domain and lets colleagues join', async ({ page, browser }) => {
    await createCompany(page, 'Ngozi Okafor', founder, company);
    await page.getByRole('link', { name: 'Sign-in & security' }).click();
    await page.getByLabel('Your email domain').fill(domain);
    await page.getByRole('button', { name: 'Add domain' }).click();
    await expect(page.getByTestId(`txt-${domain}`)).toContainText('dreamlab-verification=');
    await page.getByRole('button', { name: `Verify ${domain}` }).click();
    await expect(page.locator('li').filter({ hasText: domain }).getByText('Verified')).toBeVisible();
    await page.getByLabel(`People with an @${domain} address`).selectOption('auto');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // A colleague with an address at the domain sees the organisation and joins it.
    const ctx = await browser.newContext({ baseURL: WEB_URL });
    const colleague = await ctx.newPage();
    await signUpWithEmail(colleague, 'Emeka Colleague', `emeka@${domain}`);
    const offer = colleague.locator('form').filter({ hasText: company });
    await expect(offer.getByText(`Everyone at @${domain}`)).toBeVisible();
    await offer.getByRole('button', { name: 'Join' }).click();
    await expect(colleague).toHaveURL(/\/app\?joined=1/);
    await expect(colleague.locator('summary').filter({ hasText: company })).toBeVisible();
    await ctx.close();
  });

  test('an admin makes a custom role and can invite people into it', async ({ page }) => {
    await signedIn(page, founder);
    await switchTo(page, company);
    await page.getByRole('link', { name: 'Roles' }).click();
    await page.getByLabel('Role name').fill('Depot lead');
    await page.getByLabel('See who’s in the organisation').first().check();
    await page.getByLabel('Read progress reports').first().check();
    await page.getByRole('button', { name: 'Create role' }).click();
    await expect(page.getByText('“Depot lead” created.')).toBeVisible();
    await page.getByRole('link', { name: 'People' }).click();
    await expect(page.getByRole('radio', { name: /Depot lead/ })).toBeVisible();
  });

  test('an admin connects OIDC sign-on, tests it, and colleagues sign in with it', async ({ page, browser }) => {
    await signedIn(page, founder);
    await switchTo(page, company);
    await page.goto('/app/settings');
    await page.getByLabel('Issuer URL').fill(idp.issuer);
    await page.getByLabel('Client ID').fill(idp.clientId);
    await page.getByLabel('Client secret').fill(idp.clientSecret);
    await page.getByRole('button', { name: 'Save identity provider' }).click();
    await expect(page.getByText('Not tested yet')).toBeVisible();

    // Test sign-on as the admin: away to the identity provider and straight back.
    idp.user = { sub: 'ngozi', email: founder, name: 'Ngozi Okafor' };
    await page.getByRole('button', { name: 'Test sign-on with my account' }).click();
    await expect(page.getByText("Sign-on works: your identity provider signed you in.")).toBeVisible();
    await page.getByLabel(/Let people sign in with it/).check();
    await page.getByLabel(/Require it/).check();
    await page.getByRole('button', { name: 'Save sign-on settings' }).click();
    await expect(page.getByText('Required for your domains')).toBeVisible();

    // A new colleague: passwords are refused for the domain, and sign-on lets them in.
    const ctx = await browser.newContext({ baseURL: WEB_URL });
    const amaka = await ctx.newPage();
    await amaka.goto('/login');
    await amaka.getByRole('link', { name: 'Sign in with your organisation' }).click();
    idp.user = { sub: 'amaka', email: `amaka@${domain}`, name: 'Amaka Eze' };
    await amaka.getByLabel('Work email or organisation address').fill(`amaka@${domain}`);
    await amaka.getByRole('button', { name: 'Continue' }).click();
    await expect(amaka).toHaveURL(/\/app$/);
    await expect(amaka.locator('summary').filter({ hasText: company })).toBeVisible();
    await expect(amaka.getByRole('heading', { name: 'Welcome, Amaka.' })).toBeVisible();
    await ctx.close();
  });

  test('an admin turns on SCIM provisioning and sees the token once', async ({ page }) => {
    await page.goto('/login/sso');
    idp.user = { sub: 'ngozi', email: founder, name: 'Ngozi Okafor' };
    await page.getByLabel('Work email or organisation address').fill(founder);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/app$/);
    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Turn on provisioning' }).click();
    await expect(page.getByTestId('scim-token')).toContainText('scim_');
    await page.reload();
    await expect(page.getByTestId('scim-token')).toHaveCount(0);
    await expect(page.getByText(/On · token starting scim_/)).toBeVisible();
  });
});
