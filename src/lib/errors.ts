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
  // Two-step sign-in
  mfa_required: 'This needs your authenticator app. Confirm a code in Account → Two-step sign-in, then try again.',
  mfa_code_invalid: 'That code isn’t right. Use the newest code in your authenticator app, or a recovery code.',
  mfa_challenge_invalid: 'This sign-in took too long. Please sign in again.',
  mfa_locked: 'Too many wrong codes. Wait a few minutes and try again.',
  mfa_setup_expired: 'Setting up took too long. Start again.',
  mfa_already_enabled: 'You already have an authenticator app.',
  mfa_not_enabled: 'Add an authenticator app first.',
  mfa_needed_first: 'Add an authenticator app to your own account and confirm a code first.',
  // Single sign-on
  sso_required: 'Your organisation signs you in with its own sign-on.',
  sso_not_found: 'We couldn’t find a sign-on for that. Check the address, or sign in another way.',
  sso_failed: 'Your organisation’s sign-on didn’t complete. Please try again.',
  sso_state_invalid: 'That sign-on took too long or was already used. Please start again.',
  sso_domain_not_verified: 'Your organisation’s sign-on vouched for an address outside its verified domains.',
  sso_email_missing: 'Your organisation’s sign-on didn’t share your email address. Ask your IT team.',
  sso_unavailable: 'Your organisation’s sign-on isn’t answering right now.',
  sso_untested: 'Run “Test sign-on” once before requiring it, so nobody gets locked out.',
  sso_disabled: 'Turn single sign-on on before requiring it.',
  sso_issuer_unreachable: 'We couldn’t reach that issuer. Check the URL your identity provider gave you.',
  sso_url_invalid: 'That sign-on URL can’t be used. It must be a public https address.',
  client_secret_required: 'Paste the client secret from your identity provider.',
  certificate_invalid: 'That isn’t a valid X.509 certificate. Paste the whole certificate, including BEGIN and END lines.',
  membership_suspended: 'Your access to this organisation is paused. Ask one of its admins.',
  // Domains and joining
  domain_public: 'That’s a public email provider. Add a domain your organisation owns.',
  domain_taken: 'Another organisation has already verified that domain.',
  domain_exists: 'You’ve already added that domain.',
  domain_record_missing: 'We couldn’t find the TXT record yet. DNS changes can take a few minutes; try again shortly.',
  domain_unverified: 'Verify the domain first.',
  domain_required: 'Verify at least one email domain first.',
  domain_limit: 'You’ve reached the limit of 20 domains.',
  join_not_allowed: 'Your email address doesn’t let you join this organisation.',
  // Custom roles
  role_exists: 'A role with that name already exists.',
  role_key_reserved: 'That name belongs to a built-in role. Choose another.',
  role_in_use: 'People still hold this role. Take it away from them first.',
  permission_not_allowed: 'Custom roles can’t include platform-wide permissions.',
  role_limit: 'You’ve reached the limit of 50 custom roles.',
  network: 'We couldn’t reach Dream Lab. Check your connection and try again.',
};

/**
 * Wording for an error code carried in a URL (?sso_error=…). Only our own messages are shown, never
 * text from the link itself, so a crafted link cannot put its words on our pages.
 */
export function messageForCode(code: string | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

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
