import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { chunk } from "@/lib/coachScope";

// Shapes follow the workoutLogs data contract (Notion, 2026-10-19): userId and programId are id strings, a program
// log's doc id is workoutLogId(...), and a scheduled day is status "to-be-completed" with no start/finish time.

interface ProgramExerciseRaw {
  exerciseId?: string;
  id?: string;
  exerciseName?: string;
  name?: string;
  order?: number;
  sets?: number;
  repsRange?: string;
  restPeriod?: string;
  notes?: string | null;
  musclesInvolved?: string[];
  /** @deprecated Use musclesInvolved. Kept for backward compatibility when reading old data. */
  primaryMuscles?: string[];
}

interface ProgramWorkoutRaw {
  workoutName?: string | null;
  /** @deprecated Use workoutName. Kept for backward compatibility when reading old data. */
  dayName?: string;
  label?: string;
  dayNumber?: number;
  weekNumber?: number;
  isRestDay?: boolean;
  type?: string;
  exercises?: ProgramExerciseRaw[];
}

interface ProgramPhaseRaw {
  phaseId?: string;
  workouts?: ProgramWorkoutRaw[];
  days?: ProgramWorkoutRaw[];
}

interface ProgramDataRaw {
  phases?: ProgramPhaseRaw[];
}

interface WorkoutLogExerciseSet {
  setNumber: number;
  weight: number;
  weightUnit: "kg";
  reps: number;
  completed: boolean;
  rpe: null;
  timestamp: null;
  notes: null;
}

export interface WorkoutLogExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps: string;
  restPeriod: string;
  personalBest: boolean;
  notes: string | null;
  sets: WorkoutLogExerciseSet[];
  musclesInvolved?: string[];
}

export interface ProgramWorkoutSlot {
  /** `${phaseKey}_${weekNumber}_${dayNumber}`, unique within a program. */
  key: string;
  /** `programs.phases[].phaseId`, or null if the phase has none (or one that isn't id-safe). */
  phaseId: string | null;
  /** Position in `phases[]` + 1, for order and display. */
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
  workoutName: string;
  exercises: WorkoutLogExercise[];
}

/** Always 1 until a restart feature exists (workoutLogs data contract). */
export const PROGRAM_LOG_ROUND = 1;

const SAFE_PHASE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/** The phase's id when it can go in a doc id; the builder always writes one. */
export const usablePhaseId = (phaseId: unknown): string | null =>
  typeof phaseId === "string" && SAFE_PHASE_ID.test(phaseId) ? phaseId : null;

/**
 * The phase part of a log id: its `phaseId` (stable when other phases are added or deleted, decided 2026-10-20,
 * beshaped-backend#38), else `p{phaseNumber}` for a phase without one.
 */
export const phaseKey = (phaseId: string | null, phaseNumber: number): string => phaseId ?? `p${phaseNumber}`;

/**
 * Doc id of a client's log for one program day: `{uid}_{programId}_r{round}_{phaseKey}_w{week}d{day}`.
 * The same rule as the mobile app's lib/workout-logs.ts, so both apps write to the same doc.
 */
export const workoutLogId = (p: {
  userId: string;
  programId: string;
  round: number;
  phaseId: string | null;
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
}): string =>
  `${p.userId}_${p.programId}_r${p.round}_${phaseKey(p.phaseId, p.phaseNumber)}_w${p.weekNumber}d${p.dayNumber}`;

export const slotWorkoutLogId = (userId: string, programId: string, slot: ProgramWorkoutSlot): string =>
  workoutLogId({ userId, programId, round: PROGRAM_LOG_ROUND, ...slot });

export const buildWorkoutLogExercises = (rawExercises: ProgramExerciseRaw[] = []): WorkoutLogExercise[] =>
  rawExercises
    .map((ex, idx) => {
      const targetSets = ex.sets || 0;

      return {
        exerciseId: ex.exerciseId || ex.id || "",
        exerciseName: ex.exerciseName || ex.name || "Unknown Exercise",
        order: ex.order ?? idx + 1,
        targetSets,
        targetReps: ex.repsRange || "",
        restPeriod: ex.restPeriod || "",
        personalBest: false,
        notes: ex.notes || null,
        musclesInvolved: Array.isArray(ex.musclesInvolved) ? ex.musclesInvolved : (Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : []),
        sets: Array.from({ length: targetSets }, (_, setIdx) => ({
          setNumber: setIdx + 1,
          weight: 0,
          weightUnit: "kg" as const,
          reps: 0,
          completed: false,
          rpe: null,
          timestamp: null,
          notes: null,
        })),
      };
    })
    .sort((a, b) => a.order - b.order);

const positiveInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const DAYS_PER_WEEK = 7;

/**
 * The workout days of a program, by the day convention in the programs data contract (beshaped-app#26):
 * `phaseNumber` = position in `phases[]` + 1, `weekNumber` 1…durationWeeks restarting per phase, `dayNumber` 1–7
 * restarting per week; the phase is keyed by its `phaseId` (beshaped-backend#38, 2026-10-20). Read the same way as
 * the app's `lib/program-days.ts` (a `dayNumber` above 7 splits into week and day, a missing `weekNumber` means
 * week 1), and a day counts only if the app would offer it as a workout: not a rest day and at least one exercise.
 * Used by both the seed and the program-edit sync, so both apps write the same doc ids.
 */
export const buildProgramWorkoutSlots = (programData: ProgramDataRaw | undefined): ProgramWorkoutSlot[] => {
  if (!programData?.phases || !Array.isArray(programData.phases)) return [];

  const slots = new Map<string, ProgramWorkoutSlot>();

  programData.phases.forEach((phase, phaseIdx) => {
    const phaseNumber = phaseIdx + 1;
    const phaseId = usablePhaseId(phase?.phaseId);
    const workouts = phase.workouts || phase.days || [];

    workouts.forEach((workout) => {
      if (!workout) return;
      if (workout.isRestDay) return;
      if (workout.type === "rest" || workout.type === "empty") return;
      // The app shows a day without exercises as a rest day, so it would never fill a log for it.
      if (!Array.isArray(workout.exercises) || workout.exercises.length === 0) return;

      const rawDay = positiveInt(workout.dayNumber);
      if (rawDay === null) return;
      const weekNumber = rawDay > DAYS_PER_WEEK ? Math.ceil(rawDay / DAYS_PER_WEEK) : positiveInt(workout.weekNumber) ?? 1;
      const dayNumber = rawDay > DAYS_PER_WEEK ? ((rawDay - 1) % DAYS_PER_WEEK) + 1 : rawDay;
      const key = `${phaseKey(phaseId, phaseNumber)}_${weekNumber}_${dayNumber}`;
      if (slots.has(key)) return;

      const rawName = String(workout.workoutName || workout.dayName || workout.label || "").trim();
      slots.set(key, {
        key,
        phaseId,
        phaseNumber,
        weekNumber,
        dayNumber,
        workoutName: rawName || `Day ${dayNumber}`,
        exercises: buildWorkoutLogExercises(workout.exercises),
      });
    });
  });

  return Array.from(slots.values());
};

/** A scheduled, not-started program day. */
export const newProgramWorkoutLog = (userId: string, programId: string, programName: string, slot: ProgramWorkoutSlot) => ({
  userId,
  sourceType: "program",
  programId,
  programName,
  round: PROGRAM_LOG_ROUND,
  phaseId: slot.phaseId,
  phaseNumber: slot.phaseNumber,
  weekNumber: slot.weekNumber,
  dayNumber: slot.dayNumber,
  workoutName: slot.workoutName,
  status: "to-be-completed",
  timeStartedAt: null,
  timeCompletedAt: null,
  dateCompleted: null,
  totalDuration: null,
  exercises: slot.exercises,
  totalVolume: 0,
  totalSets: 0,
  totalReps: 0,
  personalBests: [],
  notes: null,
});

/** Docs read and written per transaction, well under Firestore's limits. */
export const TRANSACTION_CHUNK = 200;

interface SeedMissingWorkoutLogsParams {
  userId: string;
  programId: string;
  programName: string;
  slots: ProgramWorkoutSlot[];
}

/**
 * Creates a scheduled log for every program day the client has no log for yet, and leaves existing logs (started,
 * completed or scheduled) alone. Each doc is read in the transaction first, so it never overwrites a log the app
 * created at the same time. Returns the number created.
 */
export const seedMissingWorkoutLogsForUserProgram = async ({
  userId,
  programId,
  programName,
  slots,
}: SeedMissingWorkoutLogsParams): Promise<number> => {
  let createdCount = 0;

  for (const part of chunk(slots, TRANSACTION_CHUNK)) {
    createdCount += await runTransaction(db, async (transaction) => {
      const refs = part.map((slot) => doc(db, "workoutLogs", slotWorkoutLogId(userId, programId, slot)));
      const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
      let created = 0;
      snapshots.forEach((snapshot, i) => {
        if (snapshot.exists()) return;
        transaction.set(refs[i], newProgramWorkoutLog(userId, programId, programName, part[i]));
        created += 1;
      });
      return created;
    });
  }

  return createdCount;
};
