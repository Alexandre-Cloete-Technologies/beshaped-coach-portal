import type { QuerySnapshot } from 'firebase/firestore';

/**
 * When Firestore can't reach the server it doesn't throw: `getDocs` quietly answers from the offline cache, which is
 * empty on a fresh page. Showing that as "No programs yet" or "No workouts logged yet" would be wrong, so an empty
 * result that only came from the cache counts as a failed load (the page shows its error and Retry).
 */
export function requireServerResult<T extends QuerySnapshot>(snapshot: T): T {
  if (snapshot.empty && snapshot.metadata.fromCache) {
    throw new Error("Couldn't reach the database (offline result).");
  }
  return snapshot;
}
