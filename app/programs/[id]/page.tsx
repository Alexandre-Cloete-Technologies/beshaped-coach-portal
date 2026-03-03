"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Clock,
  Dumbbell,
  Hotel,
  ChevronDown,
  ChevronRight,
  Users,
  Edit,
  Copy,
  Trash2,
  Play,
  Plus,
  Search,
  GripVertical,
  X,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useSearchParams } from "next/navigation";
import WorkoutEditorModal, { ModalExercise } from "../../components/WorkoutEditorModal";

// === Types ===

interface ExerciseData {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  repsRange: string;
  tempo?: string;
  restPeriod: string;
  notes: string | null;
  isSuperset?: boolean;
  supersetGroup?: string;
}

interface WorkoutData {
  dayNumber: number;
  dayName: string;
  isRestDay: boolean;
  workoutId: string | null;
  workoutName: string | null;
  description?: string;
  estimatedDuration?: number;
  exercises: ExerciseData[];
}

interface PhaseData {
  phaseId: string;
  name: string;
  description: string;
  order: number;
  durationWeeks: number;
  focusAreas: string[];
  workouts: WorkoutData[];
}

interface ProgramDetail {
  id: string;
  name: string;
  description: string;
  totalDuration: number;
  daysPerWeek: number;
  difficulty: string;
  coverImage: string;
  createdBy: string;
  createdAt: any;
  isActive: boolean;
  phases: PhaseData[];
}

interface EditExercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  sets?: number;
  repsRange?: string;
}

interface SelectedWorkoutEdit {
  phaseIdx: number;
  dayIdx: number;
}

// === Muscle group helpers (same as builder) ===

const muscleGroupOrder = [
  "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Full Body", "Cardio", "Other"
];

const muscleToCategory: Record<string, string> = {
  "chest": "Chest", "pectorals": "Chest", "pecs": "Chest", "upper chest": "Chest", "lower chest": "Chest",
  "back": "Back", "lats": "Back", "latissimus dorsi": "Back", "rhomboids": "Back", "traps": "Back", "trapezius": "Back", "lower back": "Back", "erector spinae": "Back", "rear delts": "Back", "upper back": "Back", "mid back": "Back",
  "shoulders": "Shoulders", "delts": "Shoulders", "deltoids": "Shoulders", "front delts": "Shoulders", "side delts": "Shoulders", "lateral delts": "Shoulders", "anterior deltoid": "Shoulders", "posterior deltoid": "Shoulders", "rotator cuff": "Shoulders",
  "arms": "Arms", "biceps": "Arms", "triceps": "Arms", "forearms": "Arms", "brachialis": "Arms", "bicep": "Arms", "tricep": "Arms", "forearm": "Arms", "wrists": "Arms",
  "legs": "Legs", "quads": "Legs", "quadriceps": "Legs", "hamstrings": "Legs", "glutes": "Legs", "gluteus": "Legs", "calves": "Legs", "calf": "Legs", "hip flexors": "Legs", "adductors": "Legs", "abductors": "Legs", "thighs": "Legs", "lower body": "Legs",
  "core": "Core", "abs": "Core", "abdominals": "Core", "obliques": "Core", "lower abs": "Core", "upper abs": "Core", "transverse abdominis": "Core", "hip": "Core", "pelvis": "Core",
  "full body": "Full Body", "compound": "Full Body", "total body": "Full Body", "whole body": "Full Body",
  "cardio": "Cardio", "cardiovascular": "Cardio", "heart": "Cardio", "conditioning": "Cardio", "endurance": "Cardio",
};

const getCategoryFromMuscle = (muscle: string): string => {
  if (!muscle) return "Other";
  const normalized = muscle.toLowerCase().trim();
  if (muscleToCategory[normalized]) return muscleToCategory[normalized];
  for (const [key, category] of Object.entries(muscleToCategory)) {
    if (normalized.includes(key) || key.includes(normalized)) return category;
  }
  for (const category of muscleGroupOrder) {
    if (normalized.includes(category.toLowerCase())) return category;
  }
  return "Other";
};

interface WorkoutSlot {
  key: string;
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
  workoutName: string;
  exercises: ExerciseData[];
}

const hasWorkoutAssigned = (workout: WorkoutData): boolean =>
  Boolean(workout.workoutName?.trim()) && !workout.isRestDay;

const buildWorkoutSlotMap = (programData: ProgramDetail): Map<string, WorkoutSlot> => {
  const slots = new Map<string, WorkoutSlot>();

  programData.phases.forEach((phase, phaseIdx) => {
    const phaseNumber = phaseIdx + 1;

    phase.workouts.forEach((workout, workoutIdx) => {
      if (!hasWorkoutAssigned(workout)) return;

      const weekNumber = Math.floor(workoutIdx / 7) + 1;
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

const serializeWorkoutForComparison = (slot: WorkoutSlot): string =>
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

const buildWorkoutLogExercises = (exercises: ExerciseData[]) =>
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

// === Component ===

export default function ProgramDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const programId = params?.id as string;
  const mode = searchParams.get("mode");
  const autoEditTriggeredRef = useRef(false);

  // Core state
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProgram, setEditedProgram] = useState<ProgramDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Exercise library state
  const [exercises, setExercises] = useState<EditExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Workout modal state
  const [selectedWorkoutEdit, setSelectedWorkoutEdit] = useState<SelectedWorkoutEdit | null>(null);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // === Fetch program ===
  useEffect(() => {
    const fetchProgram = async () => {
      if (!programId) return;

      try {
        setLoading(true);
        const programDoc = await getDoc(doc(db, "programs", programId));

        if (programDoc.exists()) {
          const data = programDoc.data();
          const programData: ProgramDetail = {
            id: programDoc.id,
            name: data.name || "Untitled Program",
            description: data.description || "",
            totalDuration: data.totalDuration || 0,
            daysPerWeek: data.daysPerWeek || 7,
            difficulty: data.difficulty || "intermediate",
            coverImage: data.coverImage || "",
            createdBy: data.createdBy || "Unknown",
            createdAt: data.createdAt,
            isActive: data.isActive ?? true,
            phases: (data.phases || []).map((phase: any, idx: number) => ({
              phaseId: phase.phaseId || `phase_${idx}`,
              name: phase.name || `Phase ${idx + 1}`,
              description: phase.description || "",
              order: phase.order ?? idx,
              durationWeeks: phase.durationWeeks || 1,
              focusAreas: phase.focusAreas || [],
              workouts: (phase.workouts || []).map((w: any) => ({
                dayNumber: w.dayNumber || 0,
                dayName: w.dayName || "",
                isRestDay: w.isRestDay || false,
                workoutId: w.workoutId || null,
                workoutName: w.workoutName || null,
                description: w.description || "",
                estimatedDuration: w.estimatedDuration || 0,
                exercises: (w.exercises || []).map((ex: any) => ({
                  exerciseId: ex.exerciseId || "",
                  exerciseName: ex.exerciseName || "Unknown Exercise",
                  order: ex.order || 0,
                  sets: ex.sets || 0,
                  repsRange: ex.repsRange || "",
                  tempo: ex.tempo || "",
                  restPeriod: ex.restPeriod || "",
                  notes: ex.notes || null,
                  isSuperset: ex.isSuperset || false,
                  supersetGroup: ex.supersetGroup || "",
                })),
              })),
            })),
          };

          setProgram(programData);

          if (programData.phases.length > 0) {
            setExpandedPhases(new Set([programData.phases[0].phaseId]));
          }

          setError(null);
        } else {
          setError("Program not found");
        }
      } catch (err) {
        console.error("Error fetching program:", err);
        setError("Failed to load program");
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [programId]);

  // === Fetch exercises when entering edit mode ===
  useEffect(() => {
    if (!isEditing) return;
    if (exercises.length > 0) return; // Already loaded

    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));

        if (!exercisesSnapshot.empty) {
          const fetched: EditExercise[] = exercisesSnapshot.docs.map((doc) => {
            const data = doc.data();
            let rawMuscle = data.muscleGroup || data.muscle_group || data.muscle || data.muscles ||
              data.target || data.bodyPart || data.primaryMuscle || data.primary_muscle ||
              data.musclesInvolved || data.muscles_involved || data.muscleGroups ||
              data.muscle_groups || data.category || data.primaryGroup || "";

            if (Array.isArray(rawMuscle) && rawMuscle.length > 0) rawMuscle = rawMuscle[0];
            else if (rawMuscle && typeof rawMuscle === "object") {
              const muscleObj = rawMuscle as any;
              rawMuscle = muscleObj.name || muscleObj.title || muscleObj.slug || "";
            }

            return {
              id: doc.id,
              name: data.name || "Unnamed Exercise",
              muscleGroup: getCategoryFromMuscle(String(rawMuscle)),
              equipment: data.equipment || "None",
              difficulty: data.difficulty || "intermediate",
            };
          });
          setExercises(fetched);
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, [isEditing, exercises.length]);

  // Group exercises by muscle group
  const groupedExercises = useMemo(() => {
    const groups: Record<string, EditExercise[]> = {};
    muscleGroupOrder.forEach(group => { groups[group] = []; });
    exercises.forEach(exercise => {
      const group = muscleGroupOrder.includes(exercise.muscleGroup) ? exercise.muscleGroup : "Other";
      groups[group].push(exercise);
    });
    return groups;
  }, [exercises]);

  // Auto-expand modal groups when searching
  // (handled inside WorkoutEditorModal)

  // === Toggle functions ===
  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const toggleWorkout = (workoutKey: string) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(workoutKey)) next.delete(workoutKey);
      else next.add(workoutKey);
      return next;
    });
  };

  // === Edit mode functions ===
  const startEditing = () => {
    if (!program) return;
    setEditedProgram(JSON.parse(JSON.stringify(program)));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedProgram(null);
    setIsEditing(false);
  };

  useEffect(() => {
    autoEditTriggeredRef.current = false;
  }, [programId, mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    if (!program || isEditing) return;
    if (autoEditTriggeredRef.current) return;

    startEditing();
    autoEditTriggeredRef.current = true;
  }, [mode, program, isEditing]);

  const saveChanges = async () => {
    if (!editedProgram || !programId) return;
    try {
      setSaving(true);
      const previousProgram = program;

      await updateDoc(doc(db, "programs", programId), {
        name: editedProgram.name,
        description: editedProgram.description,
        phases: editedProgram.phases.map((phase) => ({
          ...phase,
        })),
      });

      if (previousProgram) {
        await syncWorkoutLogsForProgramChange(previousProgram, editedProgram);
      }

      setProgram(editedProgram);
      setIsEditing(false);
      setEditedProgram(null);
    } catch (err) {
      console.error("Error saving program:", err);
    } finally {
      setSaving(false);
    }
  };

  const syncWorkoutLogsForProgramChange = async (
    previousProgram: ProgramDetail,
    updatedProgram: ProgramDetail
  ) => {
    const programRef = doc(db, "programs", programId);

    const previousSlots = buildWorkoutSlotMap(previousProgram);
    const updatedSlots = buildWorkoutSlotMap(updatedProgram);

    const addedKeys = Array.from(updatedSlots.keys()).filter((key) => !previousSlots.has(key));
    const removedKeys = Array.from(previousSlots.keys()).filter((key) => !updatedSlots.has(key));
    const commonKeys = Array.from(updatedSlots.keys()).filter((key) => previousSlots.has(key));
    const currentSlotKeys = Array.from(updatedSlots.keys());

    const changedKeys = commonKeys.filter((key) => {
      const oldSlot = previousSlots.get(key);
      const newSlot = updatedSlots.get(key);
      if (!oldSlot || !newSlot) return false;
      return serializeWorkoutForComparison(oldSlot) !== serializeWorkoutForComparison(newSlot);
    });

    try {
      const [usersSnapshot, userProgramsSnapshot, workoutLogsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "users"), where("currentProgram", "==", programRef))),
        getDocs(query(collection(db, "userPrograms"), where("programId", "==", programRef))),
        getDocs(query(collection(db, "workoutLogs"), where("programId", "==", programRef))),
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
        const userId = typeof data.userId === "string" ? data.userId : data.userId?.id;
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
        // Backfill any missing open workout logs for every current workout slot.
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
            programName: updatedProgram.name || previousProgram.name || "Unknown Program",
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
            programName: updatedProgram.name || previousProgram.name || "Unknown Program",
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

  const updatePhaseName = (phaseIdx: number, value: string) => {
    if (!editedProgram) return;
    const updated = { ...editedProgram };
    updated.phases = [...updated.phases];
    updated.phases[phaseIdx] = { ...updated.phases[phaseIdx], name: value };
    setEditedProgram(updated);
  };

  const updatePhaseDescription = (phaseIdx: number, value: string) => {
    if (!editedProgram) return;
    const updated = { ...editedProgram };
    updated.phases = [...updated.phases];
    updated.phases[phaseIdx] = { ...updated.phases[phaseIdx], description: value };
    setEditedProgram(updated);
  };

  const updatePhaseDuration = (phaseIdx: number, value: number) => {
    if (!editedProgram) return;

    const safeDuration = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1;
    const updated = { ...editedProgram };
    updated.phases = [...updated.phases];

    const phase = { ...updated.phases[phaseIdx] };
    const requiredWorkouts = safeDuration * 7;
    const currentWorkouts = [...phase.workouts];

    if (currentWorkouts.length < requiredWorkouts) {
      for (let i = currentWorkouts.length; i < requiredWorkouts; i += 1) {
        currentWorkouts.push({
          dayNumber: (i % 7) + 1,
          dayName: dayNames[i % 7],
          isRestDay: false,
          workoutId: null,
          workoutName: null,
          description: "",
          estimatedDuration: 0,
          exercises: [],
        });
      }
    } else if (currentWorkouts.length > requiredWorkouts) {
      currentWorkouts.splice(requiredWorkouts);
    }

    phase.durationWeeks = safeDuration;
    phase.workouts = currentWorkouts;
    updated.phases[phaseIdx] = phase;
    setEditedProgram(updated);
  };

  const addPhase = () => {
    if (!editedProgram) return;
    const newPhase: PhaseData = {
      phaseId: `phase_${Date.now()}`,
      name: `Phase ${editedProgram.phases.length + 1}`,
      description: "",
      order: editedProgram.phases.length,
      durationWeeks: 1,
      focusAreas: [],
      workouts: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        dayName: dayNames[i],
        isRestDay: false,
        workoutId: null,
        workoutName: null,
        description: "",
        estimatedDuration: 0,
        exercises: [],
      })),
    };
    setEditedProgram({
      ...editedProgram,
      phases: [...editedProgram.phases, newPhase],
    });
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.add(newPhase.phaseId);
      return next;
    });
  };

  // === Rest day / Clear day ===
  const setRestDay = (phaseIdx: number, dayIdx: number) => {
    if (!editedProgram) return;
    const updated = JSON.parse(JSON.stringify(editedProgram));
    updated.phases[phaseIdx].workouts[dayIdx] = {
      ...updated.phases[phaseIdx].workouts[dayIdx],
      isRestDay: true,
      workoutId: null,
      workoutName: null,
      exercises: [],
    };
    setEditedProgram(updated);
  };

  const clearDay = (phaseIdx: number, dayIdx: number) => {
    if (!editedProgram) return;
    const updated = JSON.parse(JSON.stringify(editedProgram));
    updated.phases[phaseIdx].workouts[dayIdx] = {
      ...updated.phases[phaseIdx].workouts[dayIdx],
      isRestDay: false,
      workoutId: null,
      workoutName: null,
      exercises: [],
    };
    setEditedProgram(updated);
  };

  // === Workout modal handlers ===
  const openWorkoutModal = (phaseIdx: number, dayIdx: number) => {
    if (!editedProgram) return;
    const workout = editedProgram.phases[phaseIdx].workouts[dayIdx];
    setSelectedWorkoutEdit({ phaseIdx, dayIdx });
  };

  const handleWorkoutModalClose = (result: {
    workoutName: string;
    exercises: ModalExercise[];
  }) => {
    if (selectedWorkoutEdit && editedProgram) {
      const { phaseIdx, dayIdx } = selectedWorkoutEdit;
      const updated = JSON.parse(JSON.stringify(editedProgram));
      const currentWorkout = updated.phases[phaseIdx].workouts[dayIdx];

      if (result.exercises.length > 0) {
        updated.phases[phaseIdx].workouts[dayIdx] = {
          ...currentWorkout,
          isRestDay: false,
          workoutId: currentWorkout.workoutId || `workout_${phaseIdx}_${dayIdx}`,
          workoutName: result.workoutName || "New Workout",
          estimatedDuration: result.exercises.length * 5,
          exercises: result.exercises.map((ex, i) => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            order: i,
            sets: ex.sets || 3,
            repsRange: ex.repsRange || "8-12",
            tempo: "",
            restPeriod: "60s",
            notes: null,
            isSuperset: false,
            supersetGroup: "",
          })),
        };
      } else if (result.workoutName && result.workoutName !== "New Workout") {
        updated.phases[phaseIdx].workouts[dayIdx] = {
          ...currentWorkout,
          isRestDay: false,
          workoutId: currentWorkout.workoutId || `workout_${phaseIdx}_${dayIdx}`,
          workoutName: result.workoutName,
          exercises: [],
        };
      }

      setEditedProgram(updated);
    }

    setSelectedWorkoutEdit(null);
  };

  // === Helpers ===
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "intermediate":
        return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "advanced":
        return "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // === Early returns ===
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading program...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Program not found"}</p>
            <Link
              href="/programs"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Programs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Calculate stats
  const totalWorkouts = program.phases.reduce(
    (acc, phase) => acc + phase.workouts.filter((w) => w.workoutName && !w.isRestDay).length,
    0
  );
  const totalExercises = program.phases.reduce(
    (acc, phase) =>
      acc + phase.workouts.reduce((wAcc, w) => wAcc + (w.exercises?.length || 0), 0),
    0
  );
  const totalRestDays = program.phases.reduce(
    (acc, phase) => acc + phase.workouts.filter((w) => w.isRestDay).length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Back Button */}
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Programs
          </Link>

          {/* Program Header Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-lg text-white mb-8">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProgram?.name || ""}
                      onChange={(e) => setEditedProgram(editedProgram ? { ...editedProgram, name: e.target.value } : null)}
                      className="text-4xl font-bold text-white leading-tight bg-transparent border-none outline-none w-full focus:outline-none placeholder-white/50"
                    />
                  ) : (
                    <h1 className="text-4xl font-bold text-white leading-tight">
                      {program.name}
                    </h1>
                  )}
                  {isEditing ? (
                    <textarea
                      value={editedProgram?.description || ""}
                      onChange={(e) =>
                        setEditedProgram(
                          editedProgram
                            ? { ...editedProgram, description: e.target.value }
                            : null
                        )
                      }
                      rows={3}
                      placeholder="Program description..."
                      className="text-blue-100 mt-2 text-sm max-w-xl w-full bg-transparent border border-white/30 rounded-lg px-3 py-2 outline-none placeholder:text-white/60 focus:border-white/60 resize-none"
                    />
                  ) : (
                    program.description && (
                      <p className="text-blue-100 mt-2 text-sm max-w-xl">
                        {program.description}
                      </p>
                    )
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Duration</span>
                    <span className="font-medium">{program.totalDuration} Weeks</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Phases</span>
                    <span className="font-medium">{program.phases.length}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Workouts</span>
                    <span className="font-medium">{totalWorkouts}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Exercises</span>
                    <span className="font-medium">{totalExercises}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={cancelEditing}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="bg-white hover:bg-white/90 text-indigo-600 rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditing}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Program
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-6">
            {(isEditing && editedProgram ? editedProgram.phases : program.phases)
              .sort((a, b) => a.order - b.order)
              .map((phase, phaseIdx) => {
                const isExpanded = expandedPhases.has(phase.phaseId);
                const phaseWorkoutCount = phase.workouts.filter(
                  (w) => w.workoutName && !w.isRestDay
                ).length;
                const phaseExerciseCount = phase.workouts.reduce(
                  (acc, w) => acc + (w.exercises?.length || 0),
                  0
                );

                // Group workouts into weeks of 7
                const weeks: WorkoutData[][] = [];
                for (let i = 0; i < phase.workouts.length; i += 7) {
                  weeks.push(phase.workouts.slice(i, i + 7));
                }

                return (
                  <div
                    key={phase.phaseId}
                    className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
                  >
                    {/* Phase Header */}
                    <button
                      onClick={() => togglePhase(phase.phaseId)}
                      className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="text-left flex-1">
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                value={editedProgram?.phases[phaseIdx]?.name || ""}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updatePhaseName(phaseIdx, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-lg font-bold text-card-foreground bg-transparent border-none outline-none w-full focus:outline-none"
                              />
                              <textarea
                                value={editedProgram?.phases[phaseIdx]?.description || ""}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updatePhaseDescription(phaseIdx, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Phase description..."
                                rows={2}
                                className="text-sm text-muted-foreground mt-1 bg-transparent border-none outline-none w-full focus:outline-none resize-none"
                              />
                            </>
                          ) : (
                            <>
                              <h2 className="text-lg font-bold text-card-foreground">
                                {phase.name}
                              </h2>
                              {phase.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {phase.description}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {isEditing ? (
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                min={1}
                                value={editedProgram?.phases[phaseIdx]?.durationWeeks ?? 1}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updatePhaseDuration(phaseIdx, Number(e.target.value));
                                }}
                                className="w-16 h-7 px-2 rounded border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <span className="text-sm font-medium text-card-foreground">
                                {(editedProgram?.phases[phaseIdx]?.durationWeeks ?? 1) === 1 ? "Week" : "Weeks"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-card-foreground">
                              {phase.durationWeeks} {phase.durationWeeks === 1 ? "Week" : "Weeks"}
                            </span>
                          )}
                        </div>
                        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{phaseWorkoutCount} workouts</span>
                          <span>•</span>
                          <span>{phaseExerciseCount} exercises</span>
                        </div>
                      </div>
                    </button>

                    {/* Phase Content */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {weeks.map((week, weekIdx) => (
                          <div key={weekIdx} className="p-6">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                              Week {weekIdx + 1}
                            </h3>
                            <div className="grid grid-cols-7 gap-3 items-start">
                              {/* Day Headers */}
                              {dayNames.map((day) => (
                                <div key={day} className="text-center">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    {day}
                                  </span>
                                </div>
                              ))}

                              {/* Day Cards */}
                              {week.map((workout, dayIdx) => {
                                const globalDayIdx = weekIdx * 7 + dayIdx;
                                const workoutKey = `${phase.phaseId}_${weekIdx}_${dayIdx}`;
                                const isWorkoutExpanded = expandedWorkouts.has(workoutKey);
                                const hasExercises = workout.exercises && workout.exercises.length > 0;

                                // === REST DAY ===
                                if (workout.isRestDay) {
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="group relative flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground"
                                    >
                                      {isEditing && (
                                        <button
                                          onClick={() => clearDay(phaseIdx, globalDayIdx)}
                                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-500 transition-all"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                      <Hotel className="w-5 h-5 mb-1" />
                                      <span className="text-xs font-medium">Rest Day</span>
                                    </div>
                                  );
                                }

                                // === EMPTY DAY ===
                                if (!workout.workoutName) {
                                  if (isEditing) {
                                    return (
                                      <div
                                        key={dayIdx}
                                        className="flex h-28 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group bg-card relative"
                                        onClick={() => openWorkoutModal(phaseIdx, globalDayIdx)}
                                      >
                                        <div className="size-8 rounded-full bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-card flex items-center justify-center mb-2 transition-colors">
                                          <Plus className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Add Workout</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setRestDay(phaseIdx, globalDayIdx); }}
                                          className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-medium rounded bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400 transition-all flex items-center gap-1"
                                        >
                                          <Hotel className="w-3 h-3" />
                                          Rest Day
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground/50"
                                    >
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  );
                                }

                                // === WORKOUT DAY ===
                                return (
                                  <div
                                    key={dayIdx}
                                    className="group relative flex flex-col rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => {
                                      if (isEditing) {
                                        openWorkoutModal(phaseIdx, globalDayIdx);
                                      } else if (hasExercises) {
                                        toggleWorkout(workoutKey);
                                      }
                                    }}
                                  >
                                    {isEditing && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); clearDay(phaseIdx, globalDayIdx); }}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-500 transition-all z-10"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                    <div className="p-3 flex flex-col items-center justify-center gap-1.5 h-28 text-center">
                                      <p className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2">
                                        {workout.workoutName}
                                      </p>
                                      {hasExercises && (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-auto">
                                          <Dumbbell className="w-3 h-3" />
                                          {workout.exercises.length} exercises
                                          {!isEditing && (
                                            isWorkoutExpanded ? (
                                              <ChevronDown className="w-3 h-3 ml-auto" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 ml-auto" />
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Expanded Exercise List (view mode only) */}
                                    {!isEditing && isWorkoutExpanded && hasExercises && (
                                      <div className="border-t border-indigo-200 dark:border-indigo-800 bg-card/80 divide-y divide-border/50">
                                        {workout.exercises
                                          .sort((a, b) => a.order - b.order)
                                          .map((exercise, exIdx) => (
                                            <div
                                              key={exIdx}
                                              className="px-3 py-2 text-xs"
                                            >
                                              <p className="font-medium text-card-foreground truncate">
                                                {exercise.exerciseName}
                                              </p>
                                              <p className="text-muted-foreground mt-0.5">
                                                {exercise.sets} × {exercise.repsRange}
                                                {exercise.restPeriod && (
                                                  <span> · {exercise.restPeriod} rest</span>
                                                )}
                                              </p>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Phase Footer */}
                        <div className="bg-muted/50 px-6 py-3 border-t border-border flex items-center justify-between">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Total Workouts: {phaseWorkoutCount}</span>
                            <span>
                              Total Exercises: {phaseExerciseCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add Phase Button - only in edit mode */}
              {isEditing && (
                <button
                  onClick={addPhase}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-transparent py-6 transition-all hover:border-primary hover:bg-card hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add New Phase</span>
                </button>
              )}
          </div>
        </div>
      </main>

      {/* === Workout Editor Modal === */}
      {selectedWorkoutEdit && editedProgram && (
        <WorkoutEditorModal
          isOpen={true}
          workoutName={
            editedProgram.phases[selectedWorkoutEdit.phaseIdx].workouts[
              selectedWorkoutEdit.dayIdx
            ].workoutName || "New Workout"
          }
          exercises={
            (
              editedProgram.phases[selectedWorkoutEdit.phaseIdx].workouts[
                selectedWorkoutEdit.dayIdx
              ].exercises || []
            ).map(
              (ex): ModalExercise => ({
                id: ex.exerciseId,
                name: ex.exerciseName,
                muscleGroup: "",
                equipment: "",
                difficulty: "",
                sets: ex.sets,
                repsRange: ex.repsRange,
              })
            )
          }
          groupedExercises={groupedExercises as Record<string, ModalExercise[]>}
          muscleGroupOrder={muscleGroupOrder}
          loadingExercises={loadingExercises}
          onClose={handleWorkoutModalClose}
        />
      )}
    </div>
  );
}
