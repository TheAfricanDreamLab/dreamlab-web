import { type Browser, expect, type Page, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * NOTIFY-1 and MEDIA-1 in the browser: a learner attaches a file to the Problem Solving canvas; the
 * instructor is notified, opens the work from the notification and the file from the work, and
 * releases a grade; the learner is notified in turn. Needs the full local stack (notify service,
 * Azurite) with the catalog seeded.
 */

async function invite(page: Page, email: string, role: RegExp): Promise<string> {
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByLabel('Email or phone').fill(email);
  await page.getByRole('radio', { name: role }).check();
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
  await page.getByRole('button', { name: 'Accept and join' }).click();
  await expect(page).toHaveURL(/\/app\?joined=1/);
  return page;
}

/** Notifications come through the outbox and RabbitMQ: reload until one shows. */
async function waitForNotification(page: Page, title: RegExp): Promise<void> {
  await expect(async () => {
    await page.goto('/app/notifications');
    await expect(page.getByRole('button', { name: title })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

test('a file travels with the work, and both sides hear about it', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const suffix = Date.now().toString(36).slice(-5);
  const teacherEmail = unique('teacher');
  const studentEmail = unique('student');
  await createCompany(page, 'Funmi Owner', unique('owner'), `Notify Hub ${suffix}`);
  const teacher = await join(browser, await invite(page, teacherEmail, /Instructor/), 'Tobi Teacher', teacherEmail);
  const student = await join(browser, await invite(page, studentEmail, /Learner/), 'Simi Student', studentEmail);

  // The learner attaches a PDF and submits.
  await student.goto('/courses/problem-solving');
  await student.getByRole('button', { name: 'Enrol for free' }).click();
  await student.getByRole('link', { name: /Practical Output: your Problem Definition Canvas/ }).first().click();
  await student.getByLabel('Your submission').fill(Array.from({ length: 300 }, (_, i) => `idea${i}`).join(' '));
  await student.locator('input[type="file"]').setInputFiles({ name: 'canvas.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7 canvas') });
  await expect(student.getByText(/uploaded$/)).toBeVisible({ timeout: 30_000 });
  await student.getByRole('button', { name: 'Submit for review' }).click();
  await expect(student.getByText(/Submitted · version 1/).first()).toBeVisible();

  // The instructor is told, and opens the work from the notification.
  await expect(async () => {
    await teacher.goto('/app');
    await expect(teacher.getByRole('link', { name: /Notifications: \d+ unread/ })).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await waitForNotification(teacher, /New work to grade/);
  await teacher.getByRole('button', { name: /New work to grade/ }).click();
  await expect(teacher).toHaveURL(/\/app\/grading\/[0-9a-f-]+$/);
  const file = teacher.getByRole('link', { name: /canvas\.pdf/ });
  await expect(file).toHaveAttribute('href', /^\/files\/[0-9a-f-]+$/);
  const download = await teacher.request.get((await file.getAttribute('href'))!, { maxRedirects: 0 });
  expect(download.status()).toBe(307);
  expect(download.headers().location).toMatch(/sig=/);

  // The grade is released; the learner is told.
  const meets = teacher.getByRole('radio', { name: /: Meets the standard$/ });
  for (let i = 0; i < (await meets.count()); i++) await meets.nth(i).check({ force: true });
  await teacher.getByRole('button', { name: 'Release grade' }).click();
  await expect(teacher.getByText(/Released: 75%/)).toBeVisible();
  await waitForNotification(student, /was graded/);
  await student.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(student.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0);
  // The bell in the top bar (the sidebar has its own Notifications shortcut) shows no unread count.
  await expect(student.getByRole('link', { name: 'Notifications', exact: true }).last()).toBeVisible();
  await expect(student.getByRole('link', { name: /Notifications: \d+ unread/ })).toHaveCount(0);

  // Email choices live on the account page.
  await student.goto('/app/account#notifications');
  await student.getByLabel('Grades and feedback on my work').uncheck();
  await student.getByRole('button', { name: 'Save email choices' }).click();
  await expect(student.getByText('Saved. You still see everything here in the app.')).toBeVisible();
  await student.reload();
  await expect(student.getByLabel('Grades and feedback on my work')).not.toBeChecked();
});
