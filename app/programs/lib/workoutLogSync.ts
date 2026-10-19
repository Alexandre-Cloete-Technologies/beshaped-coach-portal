import {
  doc,
  DocumentReference,
  runTransaction,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  chunk,
  type CoachScope,
  fetchScopedClients,
  fetchUserProgramsForClients,
  getDocsWhereIn,
} from "@/lib/coachScope";
import {
  buildProgramWorkoutSlots,
  newProgramWorkoutLog,
  type ProgramWorkoutSlot,
  slotWorkoutLogId,
  TRANSACTION_CHUNK,
  type WorkoutLogExercise,
} from "@/lib/workoutLogSeed";
import type { ProgramFormData } from "./useProgramEditor";

const slotsByKey = (program: ProgramFormData): Map<string, ProgramWorkoutSlot> =>
  new Map(buildProgramWorkoutSlots(program).map((slot) => [slot.key, slot]));

const slotContent = (slot: ProgramWorkoutSlot): string =>
  JSON.stringify({ workoutName: slot.workoutName, exercises: slot.exercises });

const hasDoneSet = (exercise: DocumentData | undefined): boolean =>
  Array.isArray(exercise?.sets) && exercise.sets.some((s: DocumentData) => s?.completed === true);

/**
 * The program's exercises for a started log, keeping what the client already logged: an exercise that is still in
 * the program keeps its sets if any is done, and a removed exercise stays only if it has a done set.
 */
const mergeLoggedSets = (current: DocumentData[], template: WorkoutLogExercise[]): DocumentData[] => {
  const currentById = new Map(current.map((ex) => [ex?.exerciseId, ex]));
  const templateIds = new Set(template.map((ex) => ex.exerciseId));
  const merged: DocumentData[] = template.map((ex) => {
    const logged = currentById.get(ex.exerciseId);
    return hasDoneSet(logged) ? { ...ex, sets: logged!.sets } : ex;
  });
  return [...merged, ...current.filter((ex) => !templateIds.has(ex?.exerciseId) && hasDoneSet(ex))];
};

interface SlotChange {
  /** The day as saved, or as it was before the save if it was removed (its numbers give the doc id). */
  slot: ProgramWorkoutSlot;
  /** False when the save removed the day. */
  inProgram: boolean;
  /** Its name or exercises differ from before the save. */
  contentChanged: boolean;
}

type LogWrite =
  | { op: "set"; data: DocumentData }
  | { op: "update"; data: DocumentData }
  | { op: "delete" };

/**
 * What a program save does to one client's log for one day (workoutLogs data contract, 2026-10-19):
 * create a missing day; refresh a scheduled day; update a started day but keep its logged sets; never touch a
 * completed or skipped log; on a removed day, delete only a scheduled log.
 */
const planLogWrite = (
  current: DocumentData | undefined,
  change: SlotChange,
  userId: string,
  programId: string,
  programName: string,
  nameChanged: boolean
): LogWrite | null => {
  const { slot, inProgram, contentChanged } = change;

  if (!inProgram) return current?.status === "to-be-completed" ? { op: "delete" } : null;
  if (!current) return { op: "set", data: newProgramWorkoutLog(userId, programId, programName, slot) };

  if (current.status === "to-be-completed") {
    if (!contentChanged && !nameChanged) return null;
    return { op: "update", data: { programName, workoutName: slot.workoutName, exercises: slot.exercises } };
  }
  if (current.status === "in-progress") {
    if (contentChanged) {
      const exercises = mergeLoggedSets(Array.isArray(current.exercises) ? current.exercises : [], slot.exercises);
      return { op: "update", data: { programName, workoutName: slot.workoutName, exercises } };
    }
    return nameChanged ? { op: "update", data: { programName } } : null;
  }
  return null;
};

/**
 * Brings the open workoutLogs of clients on this program in line with the saved program. Only the signed-in coach's
 * clients (all clients for an admin) are read and synced; other coaches' clients on the same program keep their
 * current logs until their coach (or an admin) saves the program.
 */
export const syncWorkoutLogsForProgramChange = async (
  previousProgram: ProgramFormData,
  updatedProgram: ProgramFormData,
  programRef: DocumentReference,
  scope: CoachScope
): Promise<void> => {
  const programId = programRef.id;
  const programName = updatedProgram.name || previousProgram.name || "Unknown Program";
  const nameChanged = (updatedProgram.name || "") !== (previousProgram.name || "");
  const previousSlots = slotsByKey(previousProgram);
  const updatedSlots = slotsByKey(updatedProgram);

  const changes: SlotChange[] = [
    ...Array.from(updatedSlots.values()).map((slot) => {
      const before = previousSlots.get(slot.key);
      return { slot, inProgram: true, contentChanged: !before || slotContent(before) !== slotContent(slot) };
    }),
    ...Array.from(previousSlots.values())
      .filter((slot) => !updatedSlots.has(slot.key))
      .map((slot) => ({ slot, inProgram: false, contentChanged: true })),
  ];

  try {
    const clientDocs = await fetchScopedClients(scope);
    const clientIds = clientDocs.map((d) => d.id);
    if (clientIds.length === 0) return;

    const [userProgramDocs, workoutLogDocs] = await Promise.all([
      fetchUserProgramsForClients(clientIds, [where("programId", "==", programId)]),
      getDocsWhereIn("workoutLogs", "userId", clientIds, [where("programId", "==", programId)]),
    ]);

    // Assigned: the program is their current one (users.currentProgram stays a reference), or they have a
    // userPrograms doc for it.
    const assignedUserIds = new Set<string>();
    clientDocs.forEach((clientDoc) => {
      if (clientDoc.data().currentProgram?.path === programRef.path) assignedUserIds.add(clientDoc.id);
    });
    userProgramDocs.forEach((userProgramDoc) => {
      const userId = userProgramDoc.data().userId;
      if (typeof userId === "string" && userId) assignedUserIds.add(userId);
    });

    const existingLogs = new Map(workoutLogDocs.map((d) => [d.id, d.data()]));

    for (const userId of assignedUserIds) {
      // Plan from the query, then re-read each doc in a transaction so a log the app wrote meanwhile wins.
      const targets = changes
        .map((change) => ({ change, id: slotWorkoutLogId(userId, programId, change.slot) }))
        .filter(({ change, id }) =>
          planLogWrite(existingLogs.get(id), change, userId, programId, programName, nameChanged) !== null
        );

      for (const part of chunk(targets, TRANSACTION_CHUNK)) {
        await runTransaction(db, async (transaction) => {
          const refs = part.map(({ id }) => doc(db, "workoutLogs", id));
          const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
          snapshots.forEach((snapshot, i) => {
            const current = snapshot.exists() ? snapshot.data() : undefined;
            const write = planLogWrite(current, part[i].change, userId, programId, programName, nameChanged);
            if (!write) return;
            if (write.op === "set") transaction.set(refs[i], write.data);
            else if (write.op === "update") transaction.update(refs[i], write.data);
            else transaction.delete(refs[i]);
          });
        });
      }
    }
  } catch (syncError) {
    console.error("Error syncing workoutLogs for program change:", syncError);
  }
};
