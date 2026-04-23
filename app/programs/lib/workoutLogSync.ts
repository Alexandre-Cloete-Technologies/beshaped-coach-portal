import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  InternalExercise,
  InternalWorkout,
  ProgramFormData,
} from "./useProgramEditor";

export interface WorkoutSlot {
  key: string;
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
  workoutName: string;
  exercises: InternalExercise[];
}

export const hasWorkoutAssigned = (workout: InternalWorkout): boolean =>
  Boolean(workout.workoutName?.trim()) && !workout.isRestDay;

export const buildWorkoutSlotMap = (
  programData: ProgramFormData
): Map<string, WorkoutSlot> => {
  const slots = new Map<string, WorkoutSlot>();

  programData.phases.forEach((phase, phaseIdx) => {
    const phaseNumber = phaseIdx + 1;

    phase.workouts.forEach((workout, workoutIdx) => {
      if (!hasWorkoutAssigned(workout)) return;

      const weekNumber =
        typeof workout.weekNumber === "number" && workout.weekNumber > 0
          ? workout.weekNumber
          : Math.floor(workoutIdx / 7) + 1;
      const fallbackDayNumber = (workoutIdx % 7) + 1;
      const dayNumber =
        typeof workout.dayNumber === "number" && workout.dayNumber > 0
          ? workout.dayNumber
          : fallbackDayNumber;
      const key = `${phaseNumber}_${weekNumber}_${dayNumber}`;

      slots.set(key, {
        key,
        phaseNumber,
        weekNumber,
        dayNumber,
        workoutName: workout.workoutName?.trim() || `Workout ${dayNumber}`,
        exercises: workout.exercises || [],
      });
    });
  });

  return slots;
};

export const serializeWorkoutForComparison = (slot: WorkoutSlot): string =>
  JSON.stringify({
    workoutName: slot.workoutName,
    exercises: (slot.exercises || [])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ex, idx) => ({
        order: ex.order ?? idx + 1,
        exerciseId: ex.exerciseId || "",
        exerciseName: ex.exerciseName || "",
        sets: ex.sets || 0,
        repsRange: ex.repsRange || "",
        restPeriod: ex.restPeriod || "",
        notes: ex.notes || null,
      })),
  });

export const buildWorkoutLogExercises = (exercises: InternalExercise[]) =>
  (exercises || [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((ex, idx) => ({
      exerciseId: ex.exerciseId || "",
      exerciseName: ex.exerciseName || "Unknown Exercise",
      order: ex.order ?? idx + 1,
      targetSets: ex.sets || 0,
      targetReps: ex.repsRange || "",
      restPeriod: ex.restPeriod || "",
      personalBest: false,
      notes: ex.notes || null,
      sets: Array.from({ length: ex.sets || 0 }, (_, setIdx) => ({
        setNumber: setIdx + 1,
        weight: 0,
        weightUnit: "kg",
        reps: 0,
        completed: false,
        rpe: null,
        timestamp: null,
        notes: null,
      })),
    }));

export const syncWorkoutLogsForProgramChange = async (
  previousProgram: ProgramFormData,
  updatedProgram: ProgramFormData,
  programRef: DocumentReference
): Promise<void> => {
  const previousSlots = buildWorkoutSlotMap(previousProgram);
  const updatedSlots = buildWorkoutSlotMap(updatedProgram);

  const addedKeys = Array.from(updatedSlots.keys()).filter(
    (key) => !previousSlots.has(key)
  );
  const removedKeys = Array.from(previousSlots.keys()).filter(
    (key) => !updatedSlots.has(key)
  );
  const commonKeys = Array.from(updatedSlots.keys()).filter((key) =>
    previousSlots.has(key)
  );
  const currentSlotKeys = Array.from(updatedSlots.keys());

  const changedKeys = commonKeys.filter((key) => {
    const oldSlot = previousSlots.get(key);
    const newSlot = updatedSlots.get(key);
    if (!oldSlot || !newSlot) return false;
    return (
      serializeWorkoutForComparison(oldSlot) !==
      serializeWorkoutForComparison(newSlot)
    );
  });

  // `addedKeys` is referenced here to keep parity with the previous sync
  // logic — added slots get backfilled below when an open log is missing.
  void addedKeys;

  try {
    const [usersSnapshot, userProgramsSnapshot, workoutLogsSnapshot] =
      await Promise.all([
        getDocs(
          query(collection(db, "users"), where("currentProgram", "==", programRef))
        ),
        getDocs(
          query(
            collection(db, "userPrograms"),
            where("programId", "==", programRef)
          )
        ),
        getDocs(
          query(
            collection(db, "workoutLogs"),
            where("programId", "==", programRef)
          )
        ),
      ]);

    const assignedUserIds = new Set<string>();

    usersSnapshot.docs.forEach((userDoc) => {
      assignedUserIds.add(userDoc.id);
    });

    userProgramsSnapshot.docs.forEach((userProgramDoc) => {
      const userIdField = userProgramDoc.data().userId;
      if (typeof userIdField === "string" && userIdField) {
        assignedUserIds.add(userIdField);
        return;
      }
      if (userIdField?.id) {
        assignedUserIds.add(userIdField.id);
      }
    });

    if (assignedUserIds.size === 0) return;

    const existingLogsByUserAndSlot = new Map<
      string,
      { openLogId: string | null; openLogIds: string[] }
    >();

    workoutLogsSnapshot.docs.forEach((workoutLogDoc) => {
      const data = workoutLogDoc.data();
      const userId =
        typeof data.userId === "string" ? data.userId : data.userId?.id;
      if (!userId || !assignedUserIds.has(userId)) return;

      const phaseNumber = Number(data.phaseNumber) || 1;
      const weekNumber = Number(data.weekNumber) || 1;
      const dayNumber = Number(data.dayNumber) || 1;
      const key = `${phaseNumber}_${weekNumber}_${dayNumber}`;
      const mapKey = `${userId}::${key}`;
      const status = String(data.status || "in-progress");

      const current = existingLogsByUserAndSlot.get(mapKey) || {
        openLogId: null,
        openLogIds: [],
      };

      if (status !== "completed") {
        current.openLogIds.push(workoutLogDoc.id);
        if (!current.openLogId) {
          current.openLogId = workoutLogDoc.id;
        }
      }

      existingLogsByUserAndSlot.set(mapKey, current);
    });

    const now = Timestamp.now();
    const userIds = Array.from(assignedUserIds);

    for (const userId of userIds) {
      // Backfill open workout logs for every current workout slot.
      for (const slotKey of currentSlotKeys) {
        const slot = updatedSlots.get(slotKey);
        if (!slot) continue;

        const mapKey = `${userId}::${slotKey}`;
        const existing = existingLogsByUserAndSlot.get(mapKey);
        if (existing?.openLogId) continue;

        const createdLogRef = await addDoc(collection(db, "workoutLogs"), {
          dateCompleted: null,
          userId,
          programId: programRef,
          programName:
            updatedProgram.name || previousProgram.name || "Unknown Program",
          phaseNumber: slot.phaseNumber,
          workoutName: slot.workoutName,
          dayNumber: slot.dayNumber,
          weekNumber: slot.weekNumber,
          startedAt: now,
          completedAt: null,
          totalDuration: null,
          status: "in-progress",
          exercises: buildWorkoutLogExercises(slot.exercises),
          totalVolume: 0,
          totalSets: 0,
          totalReps: 0,
          personalBests: [],
          notes: null,
        });

        existingLogsByUserAndSlot.set(mapKey, {
          openLogId: createdLogRef.id,
          openLogIds: [...(existing?.openLogIds || []), createdLogRef.id],
        });
      }

      for (const slotKey of changedKeys) {
        const slot = updatedSlots.get(slotKey);
        if (!slot) continue;

        const mapKey = `${userId}::${slotKey}`;
        const existing = existingLogsByUserAndSlot.get(mapKey);
        if (!existing?.openLogId) continue;

        await updateDoc(doc(db, "workoutLogs", existing.openLogId), {
          programName:
            updatedProgram.name || previousProgram.name || "Unknown Program",
          phaseNumber: slot.phaseNumber,
          workoutName: slot.workoutName,
          dayNumber: slot.dayNumber,
          weekNumber: slot.weekNumber,
          exercises: buildWorkoutLogExercises(slot.exercises),
        });
      }

      for (const slotKey of removedKeys) {
        const mapKey = `${userId}::${slotKey}`;
        const existing = existingLogsByUserAndSlot.get(mapKey);
        if (!existing?.openLogIds?.length) continue;

        for (const logId of existing.openLogIds) {
          await deleteDoc(doc(db, "workoutLogs", logId));
        }
      }
    }
  } catch (syncError) {
    console.error("Error syncing workoutLogs for program change:", syncError);
  }
};
