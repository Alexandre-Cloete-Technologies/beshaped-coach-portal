// Turns the errors of the `createClient` callable (beshaped-backend#37) into text a coach can act on.
// Kept free of Firebase imports so it can be unit tested with `npm test`.

/** The `message` the callable sets on its HttpsError; the Firebase client passes it through unchanged. */
const MESSAGES: Record<string, string> = {
  'sign-in-required': 'Your session has expired. Sign in again, then add the client.',
  'staff-only': 'Your account is not allowed to add clients.',
  'coach-assigns-to-self': 'Coaches can only add clients to their own list.',
  'invalid-email': 'That email address is not valid.',
  'invalid-username': 'Enter a username (up to 100 characters).',
  'password-not-supported': 'Coaches no longer choose a password. The client sets their own from the invite email.',
  'invalid-phone-number': 'That phone number is too long.',
  'invalid-goals': 'The goals text is too long.',
  'invalid-program-id': 'The selected program is not valid. Pick it again.',
  'invalid-coach-id': 'The selected coach is not valid. Pick them again.',
  'unknown-coach': 'The selected coach is not a coach or admin account.',
  'program-not-found': 'The selected program no longer exists. Pick another one.',
  'email-already-in-use': 'This email already has an account',
  'create-failed': 'The account could not be created and nothing was saved. Please try again.',
};

/** Fallback by Firebase Functions error code (`functions/<code>`) when the message is not one of the above. */
const CODE_MESSAGES: Record<string, string> = {
  unauthenticated: MESSAGES['sign-in-required'],
  'permission-denied': MESSAGES['staff-only'],
  unavailable: 'Could not reach the server. Check your connection and try again.',
  'deadline-exceeded': 'The server took too long to answer. Check the client list before trying again.',
};

const GENERIC = 'Failed to add client. Please try again.';

export function createClientErrorMessage(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  if (typeof message === 'string' && Object.hasOwn(MESSAGES, message)) return MESSAGES[message];
  if (typeof code === 'string') {
    const short = code.replace(/^functions\//, '');
    if (Object.hasOwn(CODE_MESSAGES, short)) return CODE_MESSAGES[short];
  }
  return GENERIC;
}
