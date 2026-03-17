import {
  addDoc,
  collection,
  DocumentReference,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
}

interface ProgramWorkoutRaw {
  workoutName?: string;
  label?: string;
  dayNumber?: number;
  isRestDay?: boolean;
  type?: string;
  exercises?: ProgramExerciseRaw[];
}

interface ProgramPhaseRaw {
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

interface WorkoutLogExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps: string;
  restPeriod: string;
  personalBest: boolean;
  notes: string | null;
  sets: WorkoutLogExerciseSet[];
}

export interface ProgramWorkoutSlot {
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
  workoutName: string;
  exercises: WorkoutLogExercise[];
}

const buildWorkoutLogExercises = (rawExercises: ProgramExerciseRaw[] = []): WorkoutLogExercise[] => {
  return rawExercises.map((ex, idx) => {
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
      sets: Array.from({ length: targetSets }, (_, setIdx) => ({
        setNumber: setIdx + 1,
        weight: 0,
        weightUnit: "kg",
        reps: 0,
        completed: false,
        rpe: null,
        timestamp: null,
        notes: null,
      })),
    };
  });
};

export const buildProgramWorkoutSlots = (programData: ProgramDataRaw | undefined): ProgramWorkoutSlot[] => {
  if (!programData?.phases || !Array.isArray(programData.phases)) return [];

  const slots: ProgramWorkoutSlot[] = [];

  programData.phases.forEach((phase, phaseIdx) => {
    const phaseNumber = phaseIdx + 1;
    const workouts = phase.workouts || phase.days || [];

    workouts.forEach((workout, workoutIdx) => {
      if (!workout) return;
      if (workout.isRestDay) return;
      if (workout.type === "rest" || workout.type === "empty") return;

      const rawName = workout.workoutName || workout.dayName || workout.label || "";
      if (!String(rawName).trim()) return;

      const weekNumber = Math.floor(workoutIdx / 7) + 1;
      const fallbackDayNumber = (workoutIdx % 7) + 1;

      slots.push({
        phaseNumber,
        weekNumber,
        dayNumber: workout.dayNumber || fallbackDayNumber,
        workoutName: String(rawName).trim(),
        exercises: buildWorkoutLogExercises(workout.exercises || []),
      });
    });
  });

  return slots;
};

interface SeedMissingWorkoutLogsParams {
  userId: string;
  programRef: DocumentReference;
  programName: string;
  slots: ProgramWorkoutSlot[];
  startedAt?: Timestamp;
}

export const seedMissingWorkoutLogsForUserProgram = async ({
  userId,
  programRef,
  programName,
  slots,
  startedAt,
}: SeedMissingWorkoutLogsParams): Promise<number> => {
  if (!slots.length) return 0;

  const startedTimestamp = startedAt || Timestamp.now();
  const workoutLogsQuery = query(
    collection(db, "workoutLogs"),
    where("userId", "==", userId),
    where("programId", "==", programRef)
  );
  const existingLogsSnapshot = await getDocs(workoutLogsQuery);

  const existingOpenSlots = new Set<string>();
  existingLogsSnapshot.docs.forEach((workoutLogDoc) => {
    const data = workoutLogDoc.data();
    const status = String(data.status || "in-progress");
    if (status === "completed") return;

    const phaseNumber = Number(data.phaseNumber) || 1;
    const weekNumber = Number(data.weekNumber) || 1;
    const dayNumber = Number(data.dayNumber) || 1;
    existingOpenSlots.add(`${phaseNumber}_${weekNumber}_${dayNumber}`);
  });

  let createdCount = 0;
  for (const slot of slots) {
    const slotKey = `${slot.phaseNumber}_${slot.weekNumber}_${slot.dayNumber}`;
    if (existingOpenSlots.has(slotKey)) continue;

    await addDoc(collection(db, "workoutLogs"), {
      userId,
      programId: programRef,
      programName,
      phaseNumber: slot.phaseNumber,
      workoutName: slot.workoutName,
      dayNumber: slot.dayNumber,
      weekNumber: slot.weekNumber,
      startedAt: startedTimestamp,
      completedAt: null,
      totalDuration: null,
      status: "to-be-completed",
      exercises: slot.exercises,
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      personalBests: [],
      notes: null,
    });
    createdCount += 1;
  }

  return createdCount;
};
