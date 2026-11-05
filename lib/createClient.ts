import { getBackendFunctions, httpsCallable } from '@/lib/firebase/functions';

/** Request of the `createClient` callable (beshaped-backend#37). Leave a field out rather than sending "". */
export interface CreateClientRequest {
  email: string;
  username: string;
  /** 6-128 characters. Left out, the backend sets a random one and `passwordSetLink: true` returns a link to choose one. */
  password?: string;
  phoneNumber?: string;
  goals?: string;
  /** Admin only. A coach's own uid is the default, and a coach naming another coach is refused. */
  assignedCoachId?: string;
  /** A `programs` doc id: the backend sets `currentProgram` and `availablePrograms` on the new `users` doc. */
  programId?: string;
  passwordSetLink?: boolean;
}

export interface CreateClientResult {
  uid: string;
  passwordSetLink?: string;
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
