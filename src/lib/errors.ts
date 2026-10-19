import type { ErrorResponse } from '@dreamlab/contracts';

/** Plain-language messages for the API's error codes. Anything unknown falls back to the API's own message. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: 'That email, phone or password doesn’t match our records.',
  account_unverified: 'Please confirm your email or phone first. We’ve sent you a new code.',
  account_locked: 'Too many tries. For your safety, sign-in is paused for a few minutes.',
  account_disabled: 'This account is switched off. Contact support if you think that’s a mistake.',
  account_exists: 'You already have an account with that email or phone. Sign in instead.',
  otp_invalid: 'That code isn’t right, or it has expired. Check the latest message we sent.',
  otp_exhausted: 'Too many wrong codes. Ask for a new one and try again.',
  otp_cooldown: 'We just sent you a code. Please wait a moment before asking for another.',
  otp_limit: 'You’ve asked for a lot of codes. Please try again later.',
  rate_limited: 'Too many attempts from this network. Please wait a little and try again.',
  delivery_failed: 'We couldn’t send the message just now. Please try again in a minute.',
  sms_unavailable: 'Text messages aren’t available yet. Please use your email address.',
  google_not_configured: 'Google sign-in isn’t available yet.',
  google_token_invalid: 'Google sign-in didn’t complete. Please try again.',
  google_email_unverified: 'Your Google account needs a verified email address.',
  consent_required: 'Please accept the terms and privacy policy to continue.',
  slug_taken: 'That web address is taken. Try another, or leave it blank and we’ll pick one.',
  signup_limit: 'You’ve created several organisations today. Please try again tomorrow.',
  org_pending: 'Your organisation is still being reviewed. Until it’s approved you can only invite co-admins.',
  not_a_member: 'You’re not a member of that organisation.',
  org_context_mismatch: 'You’re signed in to a different organisation here. Switch organisation to continue.',
  permission_denied: 'You don’t have permission to do that.',
  already_member: 'That person is already a member.',
  invitation_not_found: 'This invitation link isn’t valid. Ask for a new one.',
  invitation_used: 'This invitation has already been used.',
  invitation_expired: 'This invitation has expired. Ask the person who invited you for a new one.',
  invitation_identity_mismatch: 'This invitation was sent to a different email or phone. Sign in with that one.',
  last_admin: 'Every organisation needs at least one admin. Make someone else an admin first.',
  cannot_suspend_self: 'You can’t suspend yourself.',
  validation_failed: 'Some details need another look.',
  network: 'We couldn’t reach Dream Lab. Check your connection and try again.',
};

export function friendlyError(error: ErrorResponse | undefined): string {
  if (!error) return 'Something went wrong. Please try again.';
  return (error.code && MESSAGES[error.code]) || error.message || 'Something went wrong. Please try again.';
}

/** Field-level messages from a validation_failed response, keyed by field path. */
export function fieldErrors(error: ErrorResponse | undefined): Record<string, string> {
  if (error?.code !== 'validation_failed' || !Array.isArray(error.details)) return {};
  const out: Record<string, string> = {};
  for (const issue of error.details as { path: string; message: string }[]) {
    if (issue.path && !out[issue.path]) out[issue.path] = issue.message;
  }
  return out;
}
