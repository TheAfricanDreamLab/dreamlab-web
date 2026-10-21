import { expect, type Page, test } from '@playwright/test';
import { adminCredentials, createCompany, signedIn, signUpWithEmail, unique } from './helpers';

/*
 * The app on a small phone (320px), a tablet (768px) and a large screen (1440px): no page is wider
 * than the screen, and on a phone the main navigation and sign-out can still be reached.
 */

const WIDTHS = [320, 768, 1440] as const;

/** Fails with the elements that stick out, so a regression says where to look. */
async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const clipped = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true;
      return false;
    };
    const offenders = Array.from(document.body.querySelectorAll('*'))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.right > vw + 1 && !clipped(el);
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className).split(' ').slice(0, 3).join('.')}`);
    return { scrollWidth: doc.scrollWidth, clientWidth: vw, offenders };
  });
  expect(result.scrollWidth, `${label} is wider than the screen: ${result.offenders.join(', ')}`).toBeLessThanOrEqual(result.clientWidth);
}

async function visitAll(page: Page, paths: string[]): Promise<void> {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectNoOverflow(page, `${path} at ${width}px`);
    }
  }
}

test.describe('responsive layout', () => {
  // Many pages at three widths each: give these more time than the default minute.
  test.describe.configure({ mode: 'serial', timeout: 300_000 });
  const learner = unique('responsive');
  let courseHome = '';
  let lesson = '';

  test('public pages fit, and the site menu opens on a phone', async ({ page }) => {
    await visitAll(page, ['/', '/courses', '/courses/problem-solving', '/programs/the-african-dream-lab', '/login', '/signup', '/orgs/start', '/admin/login', '/terms']);

    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    await page.getByLabel('Menu').click();
    const site = page.getByRole('navigation', { name: 'Site' });
    await expect(site.getByRole('link', { name: 'Courses' })).toBeVisible();
    await expect(site.getByRole('link', { name: 'Get started' })).toBeVisible();
    await site.getByRole('link', { name: 'Courses' }).click();
    await expect(page).toHaveURL(/\/courses$/);
  });

  test('learner pages fit, including the course home and a lesson', async ({ page }) => {
    await signUpWithEmail(page, 'Wanjiru Responsive', learner);
    await page.goto('/courses/problem-solving');
    await page.getByRole('button', { name: 'Enrol for free' }).click();
    await expect(page).toHaveURL(/\/learn\/[0-9a-f-]{36}$/);
    courseHome = new URL(page.url()).pathname;
    lesson = (await page.getByRole('link', { name: 'Start the course' }).getAttribute('href'))!;

    await visitAll(page, ['/app', '/app/learning', '/app/journal', '/app/account', courseHome, lesson]);
  });

  test('on a 320px phone the menu drawer holds the navigation, and sign-out is reachable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await signedIn(page, learner);
    await page.goto('/app');

    // The sidebar is a drawer here: closed until the menu button opens it.
    const main = page.getByRole('navigation', { name: 'Main' });
    await expect(main).toBeHidden();
    await page.getByRole('button', { name: 'Open the menu' }).click();
    await expect(main.getByRole('link', { name: 'My learning' })).toBeVisible();
    await expect(page.locator('summary').filter({ hasText: /You’re in/ })).toBeVisible();
    await expectNoOverflow(page, 'the open drawer');

    // Escape closes it; a link inside it navigates and closes it.
    await page.keyboard.press('Escape');
    await expect(main).toBeHidden();
    await page.getByRole('button', { name: 'Open the menu' }).click();
    await main.getByRole('link', { name: 'My learning' }).click();
    await expect(page).toHaveURL(/\/app\/learning$/);
    await expect(page.getByRole('heading', { name: 'My learning' })).toBeVisible();
    await expect(main).toBeHidden();

    // The course outline in the player opens and fits.
    await page.goto(lesson);
    await page.locator('summary', { hasText: 'Course outline' }).click();
    await expect(page.getByRole('navigation', { name: 'Course outline' })).toBeVisible();
    await expectNoOverflow(page, 'the course outline');

    // Sign out from the account menu in the top bar.
    await page.goto('/app');
    await page.locator('summary', { hasText: /^[A-Z]{1,2}$/ }).click();
    const signOut = page.getByRole('button', { name: 'Sign out' });
    await expect(signOut).toBeVisible();
    const box = (await signOut.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    await signOut.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('organisation admin pages fit', async ({ page }) => {
    await createCompany(page, 'Kofi Responsive', unique('responsive-founder'), `Accra Solar Cooperative ${Date.now().toString(36)}`);
    await visitAll(page, ['/app', '/app/members', '/app/roles', '/app/settings']);
  });

  test('platform admin pages fit, tables included', async ({ page }) => {
    const { email, password } = adminCredentials();
    await signedIn(page, email, password);
    await page.goto('/app/admin/users');
    const user = (await page.locator('a[href^="/app/admin/users/"]').first().getAttribute('href'))!;
    await visitAll(page, ['/app/admin', '/app/admin/users', user, '/app/admin/organisations', '/app/admin/catalog']);

    // On a phone the people table becomes stacked cards, still one row per person.
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/app/admin/users');
    await expect(page.locator('table.stack-table tbody tr').first()).toBeVisible();
    await expect(page.locator('table.stack-table thead')).toHaveCSS('position', 'absolute');
  });
});
