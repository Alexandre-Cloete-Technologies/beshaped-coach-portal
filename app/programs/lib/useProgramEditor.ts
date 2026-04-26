"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ModalExercise } from "../../components/WorkoutEditorModal";

// === Types ===

export type AccessType = "free" | "paid" | "assigned";

export interface InternalExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  repsRange: string;
  restPeriod: string;
  notes: string | null;
  musclesInvolved?: string[];
}

export interface InternalWorkout {
  dayNumber: number;
  weekNumber: number;
  isRestDay: boolean;
  workoutId: string | null;
  workoutName: string | null;
  description?: string;
  estimatedDuration?: number;
  exercises: InternalExercise[];
}

export interface InternalPhase {
  phaseId: string;
  name: string;
  description: string;
  order: number;
  durationWeeks: number;
  focusAreas: string[];
  workouts: InternalWorkout[];
}

export interface ProgramFormData {
  id?: string;
  name: string;
  description: string;
  accessType: AccessType;
  price: number | null;
  phases: InternalPhase[];
}

export interface EditExercise {
  id: string;
  name: string;
  muscleGroup: string;
  musclesInvolved?: string[];
  equipment: string;
  difficulty: string;
  sets?: number;
  repsRange?: string;
}

export type TemplateCategory = "saved";

export interface WorkoutTemplateExercise {
  exerciseId?: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: string;
  restPeriod?: string;
  notes?: string | null;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: number;
  duration: number;
  category: TemplateCategory;
  description?: string;
  tags?: string[];
  templateExercises?: WorkoutTemplateExercise[];
}

export interface WorkoutCard {
  id: string;
  workoutName: string;
  workoutId: string | null;
  description?: string;
  estimatedDuration?: number;
  exercises: ModalExercise[];
}

// === Muscle group helpers ===

export const muscleGroupOrder = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Full Body",
  "Cardio",
  "Other",
];

const muscleToCategory: Record<string, string> = {
  // Chest
  chest: "Chest", pectorals: "Chest", pecs: "Chest", "upper chest": "Chest", "lower chest": "Chest",
  // Back
  back: "Back", lats: "Back", "latissimus dorsi": "Back", rhomboids: "Back", traps: "Back", trapezius: "Back", "lower back": "Back", "erector spinae": "Back", "rear delts": "Back", "upper back": "Back", "mid back": "Back",
  // Shoulders
  shoulders: "Shoulders", delts: "Shoulders", deltoids: "Shoulders", "front delts": "Shoulders", "side delts": "Shoulders", "lateral delts": "Shoulders", "anterior deltoid": "Shoulders", "posterior deltoid": "Shoulders", "rotator cuff": "Shoulders",
  // Arms
  arms: "Arms", biceps: "Arms", triceps: "Arms", forearms: "Arms", brachialis: "Arms", bicep: "Arms", tricep: "Arms", forearm: "Arms", wrists: "Arms",
  // Legs
  legs: "Legs", quads: "Legs", quadriceps: "Legs", hamstrings: "Legs", glutes: "Legs", gluteus: "Legs", calves: "Legs", calf: "Legs", "hip flexors": "Legs", adductors: "Legs", abductors: "Legs", thighs: "Legs", "lower body": "Legs",
  // Core
  core: "Core", abs: "Core", abdominals: "Core", obliques: "Core", "lower abs": "Core", "upper abs": "Core", "transverse abdominis": "Core", hip: "Core", pelvis: "Core",
  // Full Body
  "full body": "Full Body", compound: "Full Body", "total body": "Full Body", "whole body": "Full Body",
  // Cardio
  cardio: "Cardio", cardiovascular: "Cardio", heart: "Cardio", conditioning: "Cardio", endurance: "Cardio",
};

export const getCategoryFromMuscle = (muscle: string): string => {
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

// === Mock data (fallbacks) ===

export const mockExercises: EditExercise[] = [
  { id: "1", name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell", difficulty: "intermediate" },
  { id: "2", name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbells", difficulty: "intermediate" },
  { id: "3", name: "Cable Flyes", muscleGroup: "Chest", equipment: "Cable Machine", difficulty: "beginner" },
  { id: "4", name: "Push-ups", muscleGroup: "Chest", equipment: "Bodyweight", difficulty: "beginner" },
  { id: "5", name: "Pull-ups", muscleGroup: "Back", equipment: "Pull-up Bar", difficulty: "intermediate" },
  { id: "6", name: "Barbell Rows", muscleGroup: "Back", equipment: "Barbell", difficulty: "intermediate" },
  { id: "7", name: "Lat Pulldowns", muscleGroup: "Back", equipment: "Cable Machine", difficulty: "beginner" },
  { id: "8", name: "Seated Cable Rows", muscleGroup: "Back", equipment: "Cable Machine", difficulty: "beginner" },
  { id: "9", name: "Deadlift", muscleGroup: "Back", equipment: "Barbell", difficulty: "advanced" },
  { id: "10", name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", difficulty: "intermediate" },
  { id: "11", name: "Lateral Raises", muscleGroup: "Shoulders", equipment: "Dumbbells", difficulty: "beginner" },
  { id: "12", name: "Face Pulls", muscleGroup: "Shoulders", equipment: "Cable Machine", difficulty: "beginner" },
  { id: "13", name: "Barbell Curl", muscleGroup: "Arms", equipment: "Barbell", difficulty: "beginner" },
  { id: "14", name: "Tricep Pushdowns", muscleGroup: "Arms", equipment: "Cable Machine", difficulty: "beginner" },
  { id: "15", name: "Hammer Curls", muscleGroup: "Arms", equipment: "Dumbbells", difficulty: "beginner" },
  { id: "16", name: "Barbell Back Squat", muscleGroup: "Legs", equipment: "Barbell", difficulty: "intermediate" },
  { id: "17", name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell", difficulty: "intermediate" },
  { id: "18", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", difficulty: "beginner" },
  { id: "19", name: "Leg Curls", muscleGroup: "Legs", equipment: "Machine", difficulty: "beginner" },
  { id: "20", name: "Calf Raises", muscleGroup: "Legs", equipment: "Machine", difficulty: "beginner" },
  { id: "21", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", difficulty: "beginner" },
  { id: "22", name: "Cable Crunches", muscleGroup: "Core", equipment: "Cable Machine", difficulty: "beginner" },
  { id: "23", name: "Hanging Leg Raises", muscleGroup: "Core", equipment: "Pull-up Bar", difficulty: "intermediate" },
];

// === Defaults / factories ===

const emptyWorkout = (dayIdx: number): InternalWorkout => ({
  dayNumber: (dayIdx % 7) + 1,
  weekNumber: Math.floor(dayIdx / 7) + 1,
  isRestDay: false,
  workoutId: null,
  workoutName: null,
  description: "",
  estimatedDuration: 0,
  exercises: [],
});

const makeEmptyPhase = (index: number, durationWeeks: number): InternalPhase => ({
  phaseId: `phase_${Date.now()}_${index}`,
  name: `Phase ${index + 1}`,
  description: "",
  order: index,
  durationWeeks,
  focusAreas: [],
  workouts: Array.from({ length: durationWeeks * 7 }, (_, i) => emptyWorkout(i)),
});

const createDefaultProgram = (): ProgramFormData => ({
  name: "",
  description: "",
  accessType: "free",
  price: null,
  phases: [
    {
      phaseId: "phase_1",
      name: "Phase 1",
      description: "Define the focus for this phase",
      order: 0,
      durationWeeks: 2,
      focusAreas: [],
      workouts: Array.from({ length: 14 }, (_, i) => emptyWorkout(i)),
    },
  ],
});

// === Firestore payload helper (shared by create and update) ===

export const toFirestorePayload = (data: ProgramFormData) => ({
  name: (data.name || "").trim(),
  description: (data.description || "").trim(),
  totalDuration: data.phases.reduce((acc, phase) => acc + phase.durationWeeks, 0),
  accessType: data.accessType,
  price: data.accessType === "paid" ? (data.price ?? 0) : null,
  phases: data.phases.map((phase, phaseIdx) => ({
    phaseId: phase.phaseId,
    name: phase.name,
    description: phase.description,
    order: phaseIdx,
    durationWeeks: phase.durationWeeks,
    focusAreas: phase.focusAreas || [],
    workouts: phase.workouts.map((workout, workoutIdx) => ({
      dayNumber: workout.dayNumber || (workoutIdx % 7) + 1,
      weekNumber: workout.weekNumber || Math.floor(workoutIdx / 7) + 1,
      isRestDay: workout.isRestDay,
      workoutId:
        workout.workoutId ||
        (workout.workoutName && !workout.isRestDay
          ? `workout_${phaseIdx}_${workoutIdx}`
          : null),
      workoutName: workout.isRestDay ? null : workout.workoutName || null,
      description: workout.description || "",
      estimatedDuration: workout.estimatedDuration || 0,
      exercises: (workout.exercises || []).map((ex, exIdx) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        order: ex.order ?? exIdx,
        sets: ex.sets || 3,
        repsRange: ex.repsRange || "8-12",
        restPeriod: ex.restPeriod || "60s",
        notes: ex.notes ?? null,
        musclesInvolved: ex.musclesInvolved || [],
      })),
    })),
  })),
});

// === Normalization helper (convert partial initial → full internal shape) ===

export const normalizeInitialProgram = (
  initial?: Partial<ProgramFormData>
): ProgramFormData => {
  if (!initial || !initial.phases || initial.phases.length === 0) {
    const base = createDefaultProgram();
    return {
      ...base,
      name: initial?.name ?? base.name,
      description: initial?.description ?? base.description,
      accessType: initial?.accessType ?? base.accessType,
      price: initial?.price ?? base.price,
      id: initial?.id,
    };
  }

  return {
    id: initial.id,
    name: initial.name ?? "",
    description: initial.description ?? "",
    accessType: initial.accessType ?? "free",
    price: initial.price ?? null,
    phases: initial.phases.map((phase, phaseIdx) => {
      const durationWeeks = Math.max(1, phase.durationWeeks || 1);
      const requiredWorkouts = durationWeeks * 7;
      const existing = Array.isArray(phase.workouts) ? phase.workouts : [];
      const workouts: InternalWorkout[] = [];
      for (let i = 0; i < requiredWorkouts; i += 1) {
        const w = existing[i];
        workouts.push({
          dayNumber: w?.dayNumber || (i % 7) + 1,
          weekNumber: w?.weekNumber || Math.floor(i / 7) + 1,
          isRestDay: w?.isRestDay || false,
          workoutId: w?.workoutId ?? null,
          workoutName: w?.workoutName ?? null,
          description: w?.description || "",
          estimatedDuration: w?.estimatedDuration || 0,
          exercises: (w?.exercises || []).map((ex, exIdx) => ({
            exerciseId: ex.exerciseId || "",
            exerciseName: ex.exerciseName || "Unknown Exercise",
            order: ex.order ?? exIdx,
            sets: ex.sets || 0,
            repsRange: ex.repsRange || "",
            restPeriod: ex.restPeriod || "",
            notes: ex.notes ?? null,
            musclesInvolved: ex.musclesInvolved || [],
          })),
        });
      }
      return {
        phaseId: phase.phaseId || `phase_${phaseIdx}`,
        name: phase.name || `Phase ${phaseIdx + 1}`,
        description: phase.description || "",
        order: phase.order ?? phaseIdx,
        durationWeeks,
        focusAreas: phase.focusAreas || [],
        workouts,
      };
    }),
  };
};

// === Hook options / return ===

export interface UseProgramEditorOptions {
  initialProgram?: Partial<ProgramFormData>;
  draftKey?: string;
  /** When true, all phase cards start expanded (e.g. program detail). Default: only phase 1. */
  defaultExpandAllPhases?: boolean;
}

export interface SelectedSlot {
  phaseIdx: number;
  dayIdx: number;
}

// === Hook ===

export function useProgramEditor({
  initialProgram,
  draftKey,
  defaultExpandAllPhases = false,
}: UseProgramEditorOptions) {
  // Program state
  const [program, setProgram] = useState<ProgramFormData>(() =>
    normalizeInitialProgram(initialProgram)
  );

  // Keep editor state in sync when the parent passes a new program (e.g. detail
  // page after fetch, or after save). Builder omits this prop: effect no-ops.
  // We key off object identity, not JSON.stringify, so Firestore/undefined fields
  // cannot break the sync the way stringify could.
  useEffect(() => {
    if (initialProgram == null) return;
    setProgram(normalizeInitialProgram(initialProgram));
  }, [initialProgram]);

  // Exercise library
  const [exercises, setExercises] = useState<EditExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));

        if (exercisesSnapshot.empty) {
          if (!cancelled) setExercises(mockExercises);
          return;
        }

        const fetched: EditExercise[] = exercisesSnapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          let rawMuscle: unknown =
            data.muscleGroup ||
            data.muscle_group ||
            data.muscle ||
            data.muscles ||
            data.target ||
            data.bodyPart ||
            data.primaryMuscle ||
            data.primary_muscle ||
            data.musclesInvolved ||
            data.muscles_involved ||
            data.muscleGroups ||
            data.muscle_groups ||
            data.category ||
            data.primaryGroup ||
            "";

          if (Array.isArray(rawMuscle) && rawMuscle.length > 0) {
            rawMuscle = rawMuscle[0];
          } else if (rawMuscle && typeof rawMuscle === "object") {
            const muscleObj = rawMuscle as Record<string, unknown>;
            rawMuscle =
              (muscleObj.name as string) ||
              (muscleObj.title as string) ||
              (muscleObj.slug as string) ||
              "";
          }

          return {
            id: docSnap.id,
            name: (data.name as string) || "Unnamed Exercise",
            muscleGroup: getCategoryFromMuscle(String(rawMuscle)),
            musclesInvolved: Array.isArray(data.musclesInvolved)
              ? (data.musclesInvolved as string[])
              : Array.isArray(data.primaryMuscles)
                ? (data.primaryMuscles as string[])
                : [],
            equipment: (data.equipment as string) || "None",
            difficulty: (data.difficulty as string) || "intermediate",
          };
        });

        if (!cancelled) {
          setExercises(fetched.length > 0 ? fetched : mockExercises);
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
        if (!cancelled) setExercises(mockExercises);
      } finally {
        if (!cancelled) setLoadingExercises(false);
      }
    };

    fetchExercises();
    return () => {
      cancelled = true;
    };
  }, []);

  // Saved workout templates (consumed by the sidebar "Saved Workouts" list)
  const [savedTemplates, setSavedTemplates] = useState<WorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateFetchError, setTemplateFetchError] = useState<string | null>(
    null
  );

  const fetchWorkoutTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      setTemplateFetchError(null);

      const workoutsSnapshot = await getDocs(collection(db, "workouts"));
      if (workoutsSnapshot.empty) {
        setSavedTemplates([]);
        return;
      }

      const fetchedTemplates: WorkoutTemplate[] = [];

      workoutsSnapshot.docs.forEach((workoutDoc) => {
        const data = workoutDoc.data() as Record<string, unknown>;
        const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];

        const templateExercises: WorkoutTemplateExercise[] = rawExercises.map(
          (exercise) => {
            const exerciseData = (exercise && typeof exercise === "object"
              ? exercise
              : {}) as Record<string, unknown>;
            return {
              exerciseId:
                typeof exerciseData.exerciseId === "string"
                  ? exerciseData.exerciseId
                  : undefined,
              exerciseName:
                typeof exerciseData.exerciseName === "string" &&
                exerciseData.exerciseName.trim()
                  ? exerciseData.exerciseName.trim()
                  : typeof exerciseData.name === "string" &&
                      exerciseData.name.trim()
                    ? exerciseData.name.trim()
                    : "Unnamed Exercise",
              targetSets:
                typeof exerciseData.targetSets === "number"
                  ? exerciseData.targetSets
                  : typeof exerciseData.sets === "number"
                    ? exerciseData.sets
                    : undefined,
              targetReps:
                typeof exerciseData.targetReps === "string"
                  ? exerciseData.targetReps
                  : typeof exerciseData.repsRange === "string"
                    ? exerciseData.repsRange
                    : undefined,
              restPeriod:
                typeof exerciseData.restPeriod === "string"
                  ? exerciseData.restPeriod
                  : undefined,
              notes:
                typeof exerciseData.notes === "string" ||
                exerciseData.notes === null
                  ? (exerciseData.notes as string | null)
                  : undefined,
            };
          }
        );

        const workoutName =
          typeof data.name === "string" && data.name.trim()
            ? data.name.trim()
            : "Untitled Workout";
        const exerciseCount = rawExercises.length;
        const estimatedDuration =
          typeof data.estimatedDuration === "number" &&
          Number.isFinite(data.estimatedDuration)
            ? data.estimatedDuration
            : exerciseCount * 5;

        fetchedTemplates.push({
          id: workoutDoc.id,
          name: workoutName,
          exercises: exerciseCount,
          duration: estimatedDuration,
          category: "saved",
          description:
            typeof data.description === "string" ? data.description : "",
          tags: Array.isArray(data.tags)
            ? (data.tags as unknown[]).filter(
                (tag): tag is string => typeof tag === "string"
              )
            : [],
          templateExercises,
        });
      });

      setSavedTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Error fetching workout templates:", error);
      setTemplateFetchError("Failed to load saved templates.");
      setSavedTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkoutTemplates();
  }, [fetchWorkoutTemplates]);

  // Grouped exercises by muscle group
  const [searchQuery, setSearchQuery] = useState("");

  const groupedExercises = useMemo(() => {
    const groups: Record<string, EditExercise[]> = {};
    muscleGroupOrder.forEach((group) => {
      groups[group] = [];
    });

    exercises.forEach((exercise) => {
      const group = muscleGroupOrder.includes(exercise.muscleGroup)
        ? exercise.muscleGroup
        : "Other";
      groups[group].push(exercise);
    });

    return groups;
  }, [exercises]);

  // Phase expansion (collapsed / expanded per phase)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const phaseExpansionBootstrappedRef = useRef(false);

  useEffect(() => {
    if (program.phases.length === 0) return;
    if (phaseExpansionBootstrappedRef.current) return;
    phaseExpansionBootstrappedRef.current = true;
    setExpandedPhases(
      defaultExpandAllPhases
        ? new Set(program.phases.map((p) => p.phaseId))
        : new Set([program.phases[0].phaseId])
    );
  }, [program.phases, defaultExpandAllPhases]);

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  }, []);

  // Modal state
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WorkoutTemplate | null>(null);
  const [phaseDescriptionModalIdx, setPhaseDescriptionModalIdx] = useState<
    number | null
  >(null);
  const [phaseDescriptionDraft, setPhaseDescriptionDraft] = useState("");
  const [phaseMenuOpenId, setPhaseMenuOpenId] = useState<string | null>(null);
  const [phasePendingDeleteIdx, setPhasePendingDeleteIdx] = useState<
    number | null
  >(null);

  // Program field setters
  const setProgramName = useCallback((name: string) => {
    setProgram((prev) => ({ ...prev, name }));
  }, []);

  const setProgramDescription = useCallback((description: string) => {
    setProgram((prev) => ({ ...prev, description }));
  }, []);

  const setAccessType = useCallback((accessType: AccessType) => {
    setProgram((prev) => ({
      ...prev,
      accessType,
      price: accessType === "paid" ? (prev.price ?? 0) : null,
    }));
  }, []);

  const setPrice = useCallback((price: number | null) => {
    setProgram((prev) => ({ ...prev, price }));
  }, []);

  // Phase operations
  const updatePhaseName = useCallback((phaseIdx: number, name: string) => {
    setProgram((prev) => {
      const phases = [...prev.phases];
      phases[phaseIdx] = { ...phases[phaseIdx], name };
      return { ...prev, phases };
    });
  }, []);

  const updatePhaseDescription = useCallback(
    (phaseIdx: number, description: string) => {
      setProgram((prev) => {
        const phases = [...prev.phases];
        phases[phaseIdx] = { ...phases[phaseIdx], description };
        return { ...prev, phases };
      });
    },
    []
  );

  const updatePhaseDuration = useCallback(
    (phaseIdx: number, weeks: number) => {
      const safeDuration = Number.isFinite(weeks)
        ? Math.max(1, Math.floor(weeks))
        : 1;
      setProgram((prev) => {
        const phases = [...prev.phases];
        const phase = { ...phases[phaseIdx] };
        const required = safeDuration * 7;
        const current = [...phase.workouts];
        if (current.length < required) {
          for (let i = current.length; i < required; i += 1) {
            current.push(emptyWorkout(i));
          }
        } else if (current.length > required) {
          current.splice(required);
        }
        phase.durationWeeks = safeDuration;
        phase.workouts = current;
        phases[phaseIdx] = phase;
        return { ...prev, phases };
      });
    },
    []
  );

  const addPhase = useCallback(() => {
    setProgram((prev) => {
      const newPhase = makeEmptyPhase(prev.phases.length, 1);
      const next = { ...prev, phases: [...prev.phases, newPhase] };
      setExpandedPhases((prevExpanded) => {
        const set = new Set(prevExpanded);
        set.add(newPhase.phaseId);
        return set;
      });
      return next;
    });
  }, []);

  const deletePhase = useCallback((phaseIdx: number) => {
    setProgram((prev) => {
      if (prev.phases.length <= 1) return prev;
      const phases = prev.phases.filter((_, i) => i !== phaseIdx);
      return { ...prev, phases };
    });
  }, []);

  // Day operations
  const setRestDay = useCallback((phaseIdx: number, dayIdx: number) => {
    setProgram((prev) => {
      const phases = [...prev.phases];
      const phase = { ...phases[phaseIdx] };
      const workouts = [...phase.workouts];
      workouts[dayIdx] = {
        ...workouts[dayIdx],
        isRestDay: true,
        workoutId: null,
        workoutName: null,
        exercises: [],
      };
      phase.workouts = workouts;
      phases[phaseIdx] = phase;
      return { ...prev, phases };
    });
  }, []);

  const clearDay = useCallback((phaseIdx: number, dayIdx: number) => {
    setProgram((prev) => {
      const phases = [...prev.phases];
      const phase = { ...phases[phaseIdx] };
      const workouts = [...phase.workouts];
      workouts[dayIdx] = {
        ...workouts[dayIdx],
        isRestDay: false,
        workoutId: null,
        workoutName: null,
        exercises: [],
      };
      phase.workouts = workouts;
      phases[phaseIdx] = phase;
      return { ...prev, phases };
    });
  }, []);

  const dropWorkoutOnDay = useCallback(
    (phaseIdx: number, dayIdx: number, card: WorkoutCard) => {
      setProgram((prev) => {
        const phases = [...prev.phases];
        const phase = { ...phases[phaseIdx] };
        const workouts = [...phase.workouts];
        const current = workouts[dayIdx];
        const mapped: InternalExercise[] = (card.exercises || []).map(
          (ex, idx) => ({
            exerciseId: ex.id || "",
            exerciseName: ex.name || "Unnamed Exercise",
            order: idx,
            sets: ex.sets || 3,
            repsRange: ex.repsRange || "8-12",
            restPeriod: "60s",
            notes: null,
            musclesInvolved: ex.musclesInvolved || [],
          })
        );
        workouts[dayIdx] = {
          ...current,
          isRestDay: false,
          workoutId:
            card.workoutId || current.workoutId || `workout_${phaseIdx}_${dayIdx}`,
          workoutName: card.workoutName,
          description: card.description || "",
          estimatedDuration:
            card.estimatedDuration || (card.exercises || []).length * 5,
          exercises: mapped,
        };
        phase.workouts = workouts;
        phases[phaseIdx] = phase;
        return { ...prev, phases };
      });
    },
    []
  );

  const dropTemplateOnDay = useCallback(
    (phaseIdx: number, dayIdx: number, template: WorkoutTemplate) => {
      setProgram((prev) => {
        const phases = [...prev.phases];
        const phase = { ...phases[phaseIdx] };
        const workouts = [...phase.workouts];
        const current = workouts[dayIdx];
        const droppedExercises: InternalExercise[] = Array.isArray(
          template.templateExercises
        )
          ? template.templateExercises.map((exercise, index) => {
              const exerciseId =
                exercise.exerciseId || `${template.id}-exercise-${index + 1}`;
              const fromLibrary = exercises.find((e) => e.id === exerciseId);
              return {
                exerciseId,
                exerciseName: exercise.exerciseName,
                order: index,
                sets: exercise.targetSets ?? 3,
                repsRange: exercise.targetReps ?? "8-12",
                restPeriod: exercise.restPeriod || "60s",
                notes: exercise.notes ?? null,
                musclesInvolved: fromLibrary?.musclesInvolved || [],
              };
            })
          : [];

        workouts[dayIdx] = {
          ...current,
          isRestDay: false,
          workoutId:
            template.id || current.workoutId || `workout_${phaseIdx}_${dayIdx}`,
          workoutName: template.name,
          description: template.description || "",
          estimatedDuration: template.duration,
          exercises: droppedExercises,
        };
        phase.workouts = workouts;
        phases[phaseIdx] = phase;
        return { ...prev, phases };
      });
    },
    [exercises]
  );

  const applyWorkoutEdit = useCallback(
    (
      phaseIdx: number,
      dayIdx: number,
      result: { workoutName: string; exercises: ModalExercise[] }
    ) => {
      setProgram((prev) => {
        const phases = [...prev.phases];
        const phase = { ...phases[phaseIdx] };
        const workouts = [...phase.workouts];
        const current = workouts[dayIdx];
        const mapped: InternalExercise[] = (result.exercises || []).map(
          (ex, idx) => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            order: idx,
            sets: ex.sets || 3,
            repsRange: ex.repsRange || "8-12",
            restPeriod: "60s",
            notes: null,
            musclesInvolved: ex.musclesInvolved || [],
          })
        );

        if (result.exercises.length > 0) {
          workouts[dayIdx] = {
            ...current,
            isRestDay: false,
            workoutId:
              current.workoutId || `workout_${phaseIdx}_${dayIdx}`,
            workoutName: result.workoutName || "New Workout",
            estimatedDuration: result.exercises.length * 5,
            exercises: mapped,
          };
        } else if (result.workoutName && result.workoutName !== "New Workout") {
          workouts[dayIdx] = {
            ...current,
            isRestDay: false,
            workoutId:
              current.workoutId || `workout_${phaseIdx}_${dayIdx}`,
            workoutName: result.workoutName,
            exercises: [],
          };
        }

        phase.workouts = workouts;
        phases[phaseIdx] = phase;
        return { ...prev, phases };
      });
    },
    []
  );

  const resetProgram = useCallback(() => {
    setProgram(createDefaultProgram());
    setExpandedPhases(new Set());
    setSelectedSlot(null);
    setSelectedTemplate(null);
    setPhaseDescriptionModalIdx(null);
    setPhaseDescriptionDraft("");
    setPhaseMenuOpenId(null);
    setPhasePendingDeleteIdx(null);
    if (draftKey && typeof window !== "undefined") {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  const resetToLastLoaded = useCallback(() => {
    if (initialProgram == null) return;
    setProgram(normalizeInitialProgram(initialProgram));
    setSelectedSlot(null);
    setSelectedTemplate(null);
    setPhaseDescriptionModalIdx(null);
    setPhaseDescriptionDraft("");
    setPhaseMenuOpenId(null);
    setPhasePendingDeleteIdx(null);
  }, [initialProgram]);

  // localStorage draft hydration (only when draftKey provided)
  const draftHydratedRef = useRef(false);
  useEffect(() => {
    if (!draftKey || draftHydratedRef.current) return;
    if (typeof window === "undefined") return;
    draftHydratedRef.current = true;

    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return;
      const draft = JSON.parse(stored) as Partial<ProgramFormData>;
      setProgram(normalizeInitialProgram(draft));
    } catch {
      // ignore corrupt draft
    }
  }, [draftKey]);

  // Debounced save to localStorage
  useEffect(() => {
    if (!draftKey) return;
    if (typeof window === "undefined") return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(program));
      } catch {
        // ignore quota / serialization issues
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftKey, program]);

  // Expose everything the view needs
  return {
    // program data
    program,
    setProgram,
    setProgramName,
    setProgramDescription,
    setAccessType,
    setPrice,

    // phase ops
    addPhase,
    deletePhase,
    updatePhaseName,
    updatePhaseDescription,
    updatePhaseDuration,

    // day ops
    setRestDay,
    clearDay,
    dropWorkoutOnDay,
    dropTemplateOnDay,
    applyWorkoutEdit,

    // reset
    resetProgram,
    resetToLastLoaded,

    // exercise library
    exercises,
    loadingExercises,
    groupedExercises,

    // workout templates
    savedTemplates,
    loadingTemplates,
    templateFetchError,
    fetchWorkoutTemplates,

    // sidebar search (workout list)
    searchQuery,
    setSearchQuery,

    // phase expansion
    expandedPhases,
    togglePhase,

    // modal state
    selectedSlot,
    setSelectedSlot,
    selectedTemplate,
    setSelectedTemplate,
    phaseDescriptionModalIdx,
    setPhaseDescriptionModalIdx,
    phaseDescriptionDraft,
    setPhaseDescriptionDraft,
    phaseMenuOpenId,
    setPhaseMenuOpenId,
    phasePendingDeleteIdx,
    setPhasePendingDeleteIdx,
  };
}

export type ProgramEditorState = ReturnType<typeof useProgramEditor>;
