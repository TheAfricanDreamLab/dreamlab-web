import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The IAM service's log; in development, codes and invitation links are written there instead of sent. */
const IAM_LOG = process.env.IAM_LOG ?? join(__dirname, '..', '..', 'dreamlab-api', '.logs', 'iam.log');
const API_ENV = join(__dirname, '..', '..', 'dreamlab-api', '.env');

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Strip ANSI colour codes from pretty logs.
const log = () => readFileSync(IAM_LOG, 'utf8').replace(/\u001b\[[0-9;]*m/g, '');

async function poll<T>(fn: () => T | undefined, what: string): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${what}`);
}

/** The latest one-time code sent to an email or phone, newer than `after` (number of codes seen before). */
export async function latestCode(identifier: string, after = 0): Promise<string> {
  return poll(() => {
    const matches = [...log().matchAll(new RegExp(`to=${escape(identifier)}[\\s\\S]{0,400}?: (\\d{6})\\b`, 'g'))];
    return matches.length > after ? matches.at(-1)![1] : undefined;
  }, `a code for ${identifier}`);
}

export function codeCount(identifier: string): number {
  return [...log().matchAll(new RegExp(`to=${escape(identifier)}[\\s\\S]{0,400}?: (\\d{6})\\b`, 'g'))].length;
}

export async function latestInviteLink(destination: string): Promise<string> {
  return poll(() => {
    const m = [...log().matchAll(new RegExp(`to=${escape(destination)}[\\s\\S]{0,800}?(https?://\\S+/invitations/accept\\?token=[A-Za-z0-9_-]+)`, 'g'))];
    return m.at(-1)?.[1];
  }, `an invitation for ${destination}`);
}

export function adminCredentials(): { email: string; password: string } {
  const env = Object.fromEntries(
    readFileSync(API_ENV, 'utf8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.trimStart().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  );
  return { email: env.BOOTSTRAP_ADMIN_EMAIL!, password: env.BOOTSTRAP_ADMIN_PASSWORD! };
}

export const unique = (prefix: string) => `${prefix}+${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@example.com`;
export const PASSWORD = 'learning-is-a-journey';

/** Type a six-digit code into the code boxes (paste, like a user copying from the email). */
export async function enterCode(page: Page, code: string): Promise<void> {
  const first = page.getByLabel('Digit 1');
  await first.click();
  await page.evaluate((c) => {
    const el = document.activeElement as HTMLInputElement;
    const data = new DataTransfer();
    data.setData('text', c);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, code);
  await expect(page.getByLabel('Digit 6')).toHaveValue(code[5]!);
}

export async function signUpWithEmail(page: Page, name: string, email: string, password = PASSWORD, path = '/signup'): Promise<void> {
  await page.goto(path);
  await page.getByLabel('Your full name').fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Create a password').fill(password);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole('button', { name: 'Create my account' }).click();
  await expect(page).toHaveURL(/\/verify/);
  await enterCode(page, await latestCode(email));
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await expect(page).not.toHaveURL(/\/verify/);
}

export async function signIn(page: Page, identifier: string, password = PASSWORD): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email or phone').fill(identifier);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

/** Sign in and wait until the session has landed somewhere past the sign-in page. */
export async function signedIn(page: Page, identifier: string, password = PASSWORD): Promise<void> {
  await signIn(page, identifier, password);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function signOut(page: Page): Promise<void> {
  await page.locator('summary', { hasText: /^[A-Z]{1,2}$/ }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/$/);
}
