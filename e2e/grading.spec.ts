import { type Browser, expect, type Page, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signUpWithEmail, unique, WEB_URL } from './helpers';

/*
 * LRN-3 faculty grading: an organisation invites an instructor and a learner; the learner submits the
 * Problem Solving canvas; the instructor scores the rubric, writes feedback and releases the grade;
 * the learner sees it. Needs the full local stack with the catalog seeded.
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

test('an instructor grades a submission with the rubric and the learner sees the grade', async ({ page, browser }) => {
  // Three people sign up, then enrol, submit and grade: longer than the default minute.
  test.setTimeout(180_000);
  const suffix = Date.now().toString(36).slice(-5);
  const teacherEmail = unique('teacher');
  const studentEmail = unique('student');
  await createCompany(page, 'Ngozi Owner', unique('owner'), `Grading Hub ${suffix}`);
  const teacherLink = await invite(page, teacherEmail, /Instructor/);
  const studentLink = await invite(page, studentEmail, /Learner/);
  const teacher = await join(browser, teacherLink, 'Tayo Teacher', teacherEmail);
  const student = await join(browser, studentLink, 'Sade Student', studentEmail);

  // The learner submits the canvas.
  await student.goto('/courses/problem-solving');
  await student.getByRole('button', { name: 'Enrol for free' }).click();
  await expect(student).toHaveURL(/\/learn\/[0-9a-f-]+$/);
  await student.getByRole('link', { name: /Practical Output: your Problem Definition Canvas/ }).first().click();
  await expect(student).toHaveURL(/\/learn\/[0-9a-f-]+\/[0-9a-f-]+$/);
  const itemUrl = student.url();
  await student.getByLabel('Your submission').fill(Array.from({ length: 300 }, (_, i) => `insight${i}`).join(' '));
  await student.getByRole('button', { name: 'Submit for review' }).click();
  await expect(student.getByText(/Submitted · version 1/).first()).toBeVisible();

  // The instructor grades it from the queue.
  await teacher.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Grading' }).click();
  await expect(teacher.getByRole('heading', { name: 'Grading', level: 1 })).toBeVisible();
  await teacher.getByRole('link', { name: /Sade Student · Practical Output/ }).click();
  await expect(teacher.getByRole('heading', { name: 'The learner’s work' })).toBeVisible();
  const meets = teacher.getByRole('radio', { name: /: Meets the standard$/ });
  // The radios are visually hidden behind their styled labels.
  for (let i = 0; i < (await meets.count()); i++) await meets.nth(i).check({ force: true });
  await expect(teacher.getByText('Grade: 75%')).toBeVisible();
  await teacher.getByLabel('Feedback for the learner').fill('Clear problem statement. Add one more piece of evidence.');
  await teacher.getByRole('button', { name: 'Release grade' }).click();
  await expect(teacher.getByText('Released: 75%. The learner can see it now.')).toBeVisible();

  // The learner sees the grade and the feedback.
  await student.goto(itemUrl);
  await expect(student.getByText('Faculty grade · version 1')).toBeVisible();
  await expect(student.getByText('75%').first()).toBeVisible();
  await expect(student.getByText('Clear problem statement. Add one more piece of evidence.')).toBeVisible();
  await expect(student.getByText('Graded · 75%')).toBeVisible();

  // Learners have no grading queue.
  await student.goto('/app/grading');
  await expect(student.getByText('You don’t grade in this organisation.')).toBeVisible();
});
