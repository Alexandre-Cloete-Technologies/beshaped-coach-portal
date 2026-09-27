import {
  collection,
  doc,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { PortalRole } from "@/lib/auth/AuthProvider";

/**
 * Which clients the signed-in coach may see (BSF-71): a coach sees the `users` whose
 * `assignedCoachId` equals their uid (string); an admin sees every client. All client data
 * (userPrograms, workoutLogs, nutritionLogs, progress) is read only for clients in this set.
 * Until BSF-81's rules and proper owner/coach rules ship, this scoping is UI-only.
 */
export type CoachScope = { uid: string; role: PortalRole };

/** Firestore allows at most 30 values in an `in` filter. */
export const IN_QUERY_LIMIT = 30;

export function chunk<T>(items: T[], size = IN_QUERY_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Staff accounts have a `users` doc too; keep them out of the admin's client list (display only). */
function isStaffDoc(data: DocumentData): boolean {
  return data.role === "coach" || data.role === "admin";
}

/** Whether a `users` doc belongs to this coach's client set. */
export function isClientInScope(scope: CoachScope, data: DocumentData): boolean {
  if (scope.role === "admin") return !isStaffDoc(data);
  return data.assignedCoachId === scope.uid;
}

/** The `users` docs of this coach's clients (all clients for an admin). */
export async function fetchScopedClients(scope: CoachScope): Promise<QueryDocumentSnapshot[]> {
  if (scope.role === "admin") {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.filter((d) => !isStaffDoc(d.data()));
  }
  const snapshot = await getDocs(
    query(collection(db, "users"), where("assignedCoachId", "==", scope.uid))
  );
  return snapshot.docs;
}

/**
 * `field in values` split into queries of at most 30 values, run in parallel.
 * Results are de-duplicated by document id.
 */
export async function getDocsWhereIn(
  collectionName: string,
  field: string,
  values: unknown[],
  extraConstraints: QueryConstraint[] = []
): Promise<QueryDocumentSnapshot[]> {
  if (values.length === 0) return [];
  const snapshots = await Promise.all(
    chunk(values).map((part) =>
      getDocs(query(collection(db, collectionName), ...extraConstraints, where(field, "in", part)))
    )
  );
  const byId = new Map<string, QueryDocumentSnapshot>();
  for (const snapshot of snapshots) {
    for (const d of snapshot.docs) byId.set(d.id, d);
  }
  return Array.from(byId.values());
}

/**
 * `userPrograms` for the given clients. `userId` is a reference there, but older docs may hold the
 * uid string, so match both forms.
 */
export function fetchUserProgramsForClients(
  clientIds: string[],
  extraConstraints: QueryConstraint[] = []
): Promise<QueryDocumentSnapshot[]> {
  const values = clientIds.flatMap((id) => [doc(db, "users", id), id]);
  return getDocsWhereIn("userPrograms", "userId", values, extraConstraints);
}
