// Pure helpers for the "invite a client" flow (beshaped-backend#37, Decision log 2026-10-29 D2): nobody types the
// client's password, so after `createClient` the portal sends the Firebase set-password email. Kept free of Firebase
// imports so it can be unit tested with `npm test`.

/** Whether the two email fields agree. Emails are not case sensitive and the form trims them. */
export function emailsMatch(email: string, confirmEmail: string): boolean {
  const a = email.trim().toLowerCase();
  return a !== '' && a === confirmEmail.trim().toLowerCase();
}

const INVITE_ERRORS: Record<string, string> = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'This email has no account yet.',
  'auth/too-many-requests': 'Too many emails were sent to this address. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Could not reach the server. Check your connection and try again.',
};

/** Text for a failed `sendPasswordResetEmail`; never the raw error. */
export function inviteEmailErrorMessage(error: unknown): string {
  const { code } = (error ?? {}) as { code?: unknown };
  if (typeof code === 'string' && Object.hasOwn(INVITE_ERRORS, code)) return INVITE_ERRORS[code];
  return 'The email could not be sent. Please try again.';
}
