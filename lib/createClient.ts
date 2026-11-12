import { getBackendFunctions, httpsCallable } from '@/lib/firebase/functions';

/** Request of the `createClient` callable (beshaped-backend#37). Leave a field out rather than sending "". */
export interface CreateClientRequest {
  email: string;
  username: string;
  phoneNumber?: string;
  goals?: string;
  /** Admin only. A coach's own uid is the default, and a coach naming another coach is refused. */
  assignedCoachId?: string;
  /** A `programs` doc id: the backend sets `currentProgram` and `availablePrograms` on the new `users` doc. */
  programId?: string;
  // No password: the backend refuses one (Decision log 2026-10-29, D2). The client sets their own from the
  // set-password email the portal sends after this call (see lib/clientInvite.ts).
}

export interface CreateClientResult {
  uid: string;
}

/**
 * Creates a client's Auth account and `users/{uid}` doc server-side (Admin SDK), so the coach stays signed in.
 * Replaces the browser-side `createAccountForClient`. Rejects with a FirebaseError whose message is one of the
 * backend's codes: show it with `createClientErrorMessage`.
 */
export async function createClientAccount(request: CreateClientRequest): Promise<CreateClientResult> {
  const callable = httpsCallable<CreateClientRequest, CreateClientResult>(getBackendFunctions(), 'createClient');
  const { data } = await callable(request);
  return data;
}
