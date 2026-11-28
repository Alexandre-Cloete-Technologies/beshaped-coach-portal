import { getBackendFunctions, httpsCallable } from '@/lib/firebase/functions';

/**
 * Archiving and erasing clients through the backend callables (beshaped-backend `setClientArchived`,
 * `deleteClient`). Both need the Admin SDK (Auth account, every collection, Storage), so the portal never does
 * this from the browser.
 * - Archive: a coach (own clients) or admin. Turns off the client's sign-in and hides them; keeps all data.
 * - Delete permanently: admins only. Erases the Auth account, every doc they own and their Storage files.
 */

export async function setClientArchived(uid: string, archived: boolean): Promise<void> {
  await httpsCallable<{ uid: string; archived: boolean }, { uid: string; archived: boolean }>(
    getBackendFunctions(),
    'setClientArchived'
  )({ uid, archived });
}

export async function deleteClientPermanently(uid: string): Promise<{ deletedDocs: number; deletedFiles: number }> {
  const result = await httpsCallable<{ uid: string }, { uid: string; deletedDocs: number; deletedFiles: number }>(
    getBackendFunctions(),
    'deleteClient'
  )({ uid });
  return result.data;
}

const MESSAGES: Record<string, string> = {
  'staff-only': 'Only coaches and admins can do this.',
  'admin-only': 'Only an admin can permanently delete a client.',
  'not-a-client': 'This account is a coach or admin, not a client.',
  'not-your-client': 'This client is assigned to another coach.',
  'client-not-found': 'This client no longer exists. Reload the list.',
  'sign-in-required': 'Your session has ended. Sign in again.',
};

/** A message a coach can act on, from the callable's HttpsError message (its error code). */
export function clientRemovalErrorMessage(error: unknown): string {
  const message = (error as { message?: string } | null)?.message ?? '';
  return MESSAGES[message] ?? 'Something went wrong. Please try again.';
}
