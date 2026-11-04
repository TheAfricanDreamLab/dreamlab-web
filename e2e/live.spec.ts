import { type Browser, expect, type Page, test } from '@playwright/test';
import { createCompany, latestInviteLink, PASSWORD, signUpWithEmail, unique, WEB_URL } from './helpers';

/** A real 1×1 PNG, for a picture post. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

/*
 * LIVE-1 and COMM-1, the parts that work without a media server: a cohort manager assigns a mentor
 * and forms a Dream Circle; the mentor schedules an online meeting, which opens for joining; the
 * learner sees their mentor, the meeting and their circle on My programme; faculty find the live
 * class and recordings on the class register. Joining a room needs LiveKit and is not covered here.
 * Needs the full local stack with the catalog seeded.
 */

async function inviteMentor(page: Page, email: string): Promise<string> {
  await page.getByRole('link', { name: 'People' }).click();
  await page.getByLabel('Email or phone').fill(email);
  await page.getByRole('radio', { name: /Mentor/ }).check();
  await page.getByRole('button', { name: 'Send invitation' }).click();
  await expect(page.getByText(`Invitation sent to ${email}.`)).toBeVisible();
  return (await latestInviteLink(email)).replace(/^https?:\/\/[^/]+/, '');
}

async function acceptInvite(browser: Browser, link: string, name: string, email: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL });
  const page = await context.newPage();
  await page.goto(link);
  await page.getByRole('link', { name: 'Create my account to accept' }).click();
  await expect(page).toHaveURL(/\/signup/);
  await signUpWithEmail(page, name, email, PASSWORD, page.url());
  await expect(page).toHaveURL(/\/invitations\/accept$/);
  await page.getByRole('button', { name: 'Accept and join' }).click();
  await expect(page).toHaveURL(/\/app\?joined=1/);
  return page;
}

async function joinCohort(browser: Browser, name: string, cohortName: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: WEB_URL });
  const page = await context.newPage();
  await signUpWithEmail(page, name, unique(name.split(' ')[0]!.toLowerCase()));
  await page.goto('/programs/the-african-dream-lab');
  await page.getByRole('button', { name: `Join ${cohortName}` }).click();
  await expect(page).toHaveURL(/\/app\/programme\?joined=/);
  return page;
}

/** A datetime-local value a few minutes from now, in the browser's (this machine's) time zone. */
function soon(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

test('a cohort’s mentors and Dream Circles reach the learner, and mentors schedule meetings', async ({ page, browser }) => {
  // Four people sign up and a cohort is scheduled: longer than the default minute.
  test.setTimeout(240_000);
  const suffix = Date.now().toString(36).slice(-5);
  const cohortName = `Cohort ${suffix}`;
  const mentorEmail = unique('mentor');

  // The host schedules a cohort starting today, open to anyone signed in, and invites a mentor.
  await createCompany(page, 'Halima Host', unique('host'), `Live Hub ${suffix}`);
  const mentorLink = await inviteMentor(page, mentorEmail);
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Cohorts' }).click();
  await page.getByLabel('Name').fill(cohortName);
  await page.getByLabel('First day of week 1').fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel('Who can join').selectOption('open');
  await page.getByRole('button', { name: 'Schedule cohort' }).click();
  await expect(page).toHaveURL(/\/app\/cohorts\/[0-9a-f-]+\?created=1/);
  await page.getByRole('button', { name: 'Open for joining' }).click();
  await expect(page.getByText('Open to join', { exact: true })).toBeVisible();
  const cohortUrl = page.url().split('?')[0]!;

  const mentor = await acceptInvite(browser, mentorLink, 'Musa Mentor', mentorEmail);
  const ada = await joinCohort(browser, 'Ada Obi', cohortName);
  const tunde = await joinCohort(browser, 'Tunde Bakare', cohortName);

  // The host assigns the mentor to Ada and puts both learners in a circle.
  await page.goto(cohortUrl);
  await page.getByRole('link', { name: 'Mentors and Dream Circles' }).click();
  await expect(page.getByRole('heading', { name: 'Mentors and Dream Circles', level: 1 })).toBeVisible();
  await page.getByLabel('Mentor', { exact: true }).selectOption({ label: 'Musa Mentor' });
  await page.getByRole('group', { name: 'Learners' }).getByLabel('Ada Obi').check();
  await page.getByRole('button', { name: 'Assign mentor' }).click();
  await expect(page.getByText('Mentor assigned. They have both been told.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End Musa Mentor mentoring Ada Obi' })).toBeVisible();

  const newCircle = page.getByRole('heading', { name: 'Form a circle' }).locator('..');
  await newCircle.getByLabel('Circle name').fill('Sankofa');
  await newCircle.getByLabel('Ada Obi').check();
  await newCircle.getByLabel('Tunde Bakare').check();
  await newCircle.getByRole('button', { name: 'Form circle' }).click();
  await expect(page.getByText('Sankofa is formed. Its members have been told.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sankofa', level: 3 })).toBeVisible();

  // The mentor schedules an online meeting in five minutes: its room is already open.
  await mentor.goto('/app/mentoring');
  await expect(mentor.getByRole('heading', { name: 'Mentoring', level: 1 })).toBeVisible();
  await expect(mentor.getByText('Ada Obi').first()).toBeVisible();
  await mentor.getByLabel('When (your time)').fill(soon(5));
  await mentor.getByRole('button', { name: 'Schedule meeting' }).click();
  await expect(mentor.getByText('Scheduled with Ada Obi. They have been told.')).toBeVisible();
  await expect(mentor.getByRole('link', { name: 'Join meeting with Ada Obi' })).toBeVisible();

  // Ada sees her mentor, the meeting and her circle; Tunde has a circle but no mentor.
  await ada.goto('/app/programme');
  const adaCommunity = ada.getByRole('heading', { name: 'My community' }).locator('..');
  await expect(adaCommunity.getByText('Musa Mentor').first()).toBeVisible();
  await expect(adaCommunity.getByRole('link', { name: 'Join meeting' })).toBeVisible();
  await expect(adaCommunity.getByText('Sankofa')).toBeVisible();
  await tunde.goto('/app/programme');
  const tundeCommunity = tunde.getByRole('heading', { name: 'My community' }).locator('..');
  await expect(tundeCommunity.getByText('You don’t have a mentor yet.', { exact: false })).toBeVisible();
  await expect(tundeCommunity.getByRole('list', { name: 'Members of Sankofa' }).getByText('Ada Obi')).toBeVisible();

  // The mentor logs the meeting as held; Ada then reads the notes.
  await mentor.getByRole('button', { name: 'Log or change meeting with Ada Obi' }).click();
  await mentor.getByText('Held', { exact: true }).click();
  await mentor.getByLabel('Notes').fill('Agreed to interview five farmers before Friday.');
  await mentor.getByRole('button', { name: 'Save meeting' }).click();
  await expect(mentor.getByText('Logged as held.')).toBeVisible();
  // The save and Ada's page load can cross; she sees the notes once the save has landed.
  await expect(async () => {
    await ada.goto('/app/programme');
    await expect(ada.getByText('Agreed to interview five farmers before Friday.')).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });

  // Faculty find the live room and the recordings on a class register.
  await page.goto(cohortUrl);
  await page.getByRole('link', { name: /^(Register|Attendance) for / }).first().click();
  await expect(page.getByRole('heading', { name: 'Recordings' })).toBeVisible();
  await expect(page.getByText('Upload a recording')).toBeVisible();
  await expect(page.getByLabel('Recording title')).toHaveValue(/, week 1$/);

  // Learners can't manage the cohort's community.
  await ada.goto(page.url().replace(/\/sessions\/.*$/, '/community'));
  await expect(ada.getByRole('heading', { name: 'Mentors and Dream Circles' })).toHaveCount(0);

  // COMM-2: the circle's own space. Ada posts a picture and a link; Post waits for something to post.
  await ada.goto('/app/programme');
  await ada.getByRole('heading', { name: 'My community' }).locator('..').getByRole('link', { name: 'Open circle' }).click();
  await expect(ada.getByRole('heading', { name: 'Sankofa', level: 1 })).toBeVisible();
  const circleUrl = ada.url();
  const post = ada.getByRole('button', { name: 'Post', exact: true });
  await expect(post).toBeDisabled();
  await ada.getByLabel('Share an update, a question or a win with your circle').fill('First prototype, notes at https://127.0.0.1/notes');
  await ada.locator('input[type=file]').first().setInputFiles({ name: 'prototype.png', mimeType: 'image/png', buffer: PNG });
  await expect(ada.getByText(/^\d+(\.\d+)? (B|KB)$/).first()).toBeVisible({ timeout: 30_000 });
  await post.click();
  const posted = ada.getByRole('article').filter({ hasText: 'First prototype' });
  await expect(posted.getByRole('img', { name: 'prototype.png' })).toBeVisible();
  await expect(posted.getByRole('link', { name: /127\.0\.0\.1/ }).first()).toBeVisible();

  // Tunde replies; he cannot remove Ada's post. Her mentor pins it.
  await tunde.goto(circleUrl);
  const seen = tunde.getByRole('article').filter({ hasText: 'First prototype' }).first();
  await expect(seen.getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await seen.getByRole('button', { name: 'Reply' }).click();
  await seen.getByLabel('Reply to Ada Obi').fill('Love the colours.');
  await seen.getByRole('button', { name: 'Reply', exact: true }).last().click();
  await expect(seen.getByText('Love the colours.')).toBeVisible();
  await mentor.goto('/app/mentoring');
  await mentor.getByRole('heading', { name: 'Your mentees’ Dream Circles' }).locator('..').getByRole('link', { name: 'Open circle' }).click();
  await expect(mentor).toHaveURL(circleUrl);
  await expect(mentor.getByText('you are here as a mentor')).toBeVisible();
  await mentor.getByRole('article').filter({ hasText: 'First prototype' }).first().getByRole('button', { name: 'Pin' }).click();
  await expect(mentor.getByRole('article').filter({ hasText: 'First prototype' }).first().getByText('Pinned')).toBeVisible();
  await ada.reload();
  await expect(ada.getByRole('article').filter({ hasText: 'First prototype' }).first().getByRole('button', { name: '1 reply' })).toBeVisible();

  // COMM-3: nothing is shared until Ada chooses to; then Tunde can reach her on WhatsApp.
  const adaCard = tunde.getByRole('list', { name: 'People in this circle' }).getByRole('listitem').filter({ hasText: 'Ada Obi' });
  await expect(adaCard.getByText('No contact details shared.')).toBeVisible();
  await ada.getByText('Your contact details').click();
  const save = ada.getByRole('button', { name: 'Save contact details' });
  await expect(save).toBeDisabled();
  await ada.getByLabel('Phone').fill('+234 801 234 5678');
  await ada.getByLabel('This number is on WhatsApp').check();
  await save.click();
  await expect(ada.getByText('Saved. The people in this circle can now see what you shared.')).toBeVisible();
  await tunde.reload();
  await expect(adaCard.getByRole('link', { name: 'WhatsApp Ada Obi' })).toHaveAttribute('href', 'https://wa.me/2348012345678');
  await expect(adaCard.getByRole('link', { name: 'Email Ada Obi' })).toHaveCount(0);

  // Tunde sets up a meetup in person; Ada sees it, and can't cancel what she didn't set up.
  await tunde.getByText('Set up a meetup').click();
  await tunde.getByLabel('What', { exact: true }).fill('Market walk');
  await tunde.getByLabel('When (your time)').fill(soon(24 * 60));
  await tunde.getByText('In person', { exact: true }).click();
  await tunde.getByLabel('Place', { exact: true }).fill('Ogbete Market');
  await tunde.getByRole('button', { name: 'Schedule meetup' }).click();
  await expect(tunde.getByText('Meetup scheduled.', { exact: false })).toBeVisible();
  await ada.reload();
  const meetups = ada.getByRole('list', { name: 'Coming meetups' });
  await expect(meetups.getByText('Market walk')).toBeVisible();
  await expect(meetups.getByText('At Ogbete Market')).toBeVisible();
  await expect(meetups.getByRole('button', { name: /Cancel meetup/ })).toHaveCount(0);

  // Circle news can be switched off by email on its own.
  await ada.goto('/app/account');
  await expect(ada.getByLabel('My Dream Circles: posts, replies, calls and meetups')).toBeChecked();
  await ada.goto(circleUrl);

  // Anyone in the circle starts a call; it is never recorded.
  await ada.getByRole('link', { name: 'Start a call' }).click();
  await expect(ada.getByText('Not recorded')).toBeVisible();
  await expect(ada.locator('.lk-room-container, [data-lk-theme]').first()).toBeVisible({ timeout: 60_000 });

  for (const p of [mentor, ada, tunde]) await p.context().close();
});
