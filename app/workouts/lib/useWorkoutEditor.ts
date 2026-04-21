"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exercise, getCategoryFromMuscle } from "./exercise";
import { ModalExercise } from "../../components/WorkoutEditorModal";

/** Sets as free text in the editor (same idea as reps); parsed when saving. */
export type CreateWorkoutExercise = Omit<ModalExercise, "sets"> & { sets?: string };

export function toCreateWorkoutExercise(ex: Exercise): CreateWorkoutExercise {
  return {
    ...ex,
    difficulty: ex.difficulty,
    sets: "3",
    repsRange: "8-12",
  };
}

export function targetSetsFromForm(s: string | undefined): number {
  const n = parseInt(String(s ?? "").trim(), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export type InitialExerciseRef = {
  exerciseId: string;
  targetSets?: number;
  targetReps?: string;
};

export type UseWorkoutEditorOptions = {
  initialWorkoutName?: string;
  initialExercises?: CreateWorkoutExercise[];
  /**
   * Lightweight refs hydrated against the exercise library once it loads.
   * Use this when you only have saved rows (e.g. from a workout doc) and
   * don't want to refetch the library yourself.
   */
  initialExerciseRefs?: InitialExerciseRef[];
  /** If provided, save updates this workout doc instead of creating a new one. */
  existingWorkoutId?: string;
  /** Path to navigate to after a successful save. Defaults to "/workouts". */
  redirectTo?: string;
};

export type WorkoutEditorState = {
  // Workout name
  workoutName: string;
  setWorkoutName: (name: string) => void;
  nameError: boolean;
  setNameError: (error: boolean) => void;
  workoutNameInputRef: React.RefObject<HTMLInputElement | null>;

  // Workout exercises (right column)
  workoutExercises: CreateWorkoutExercise[];
  addFromLibrary: (ex: Exercise) => void;
  removeAt: (index: number) => void;
  updateExercise: (index: number, field: keyof CreateWorkoutExercise, value: unknown) => void;

  // Library (left column)
  library: Exercise[];
  loadingLibrary: boolean;
  filteredLibrary: Exercise[];
  libraryCategoryCounts: Record<string, number>;

  // Search + category filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategories: Set<string>;
  setSelectedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleCategory: (cat: string) => void;

  // Drag + drop
  draggedIndex: number | null;
  onDragStartRow: (index: number) => void;
  onDragOverRow: (e: React.DragEvent, index: number) => void;
  onDragEndRow: () => void;
  onDropBuilder: (e: React.DragEvent<HTMLDivElement>) => void;

  // Focus guard so text selection in Sets/Reps doesn't start a drag
  inputFocusRowIndex: number | null;
  setInputFocusRowIndex: (index: number | null) => void;
  onExerciseInputsBlur: (rowIndex: number) => void;

  // Save
  saving: boolean;
  handleSave: () => Promise<void>;
};

export function useWorkoutEditor({
  initialWorkoutName = "",
  initialExercises,
  initialExerciseRefs,
  existingWorkoutId,
  redirectTo = "/workouts",
}: UseWorkoutEditorOptions = {}): WorkoutEditorState {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState(initialWorkoutName);
  const [workoutExercises, setWorkoutExercises] = useState<CreateWorkoutExercise[]>(
    initialExercises ?? []
  );
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [inputFocusRowIndex, setInputFocusRowIndex] = useState<number | null>(null);
  const [nameError, setNameError] = useState(false);
  const workoutNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoadingLibrary(true);
        const snapshot = await getDocs(collection(db, "exercises"));
        if (snapshot.empty) {
          setLibrary([]);
          return;
        }
        const fetched: Exercise[] = snapshot.docs.map((d) => {
          const data = d.data();
          let rawMuscle =
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

          if (Array.isArray(rawMuscle) && rawMuscle.length > 0) rawMuscle = rawMuscle[0];
          else if (rawMuscle && typeof rawMuscle === "object") {
            const muscleObj = rawMuscle as { name?: string; title?: string; slug?: string };
            rawMuscle = muscleObj.name || muscleObj.title || muscleObj.slug || "";
          }

          return {
            id: d.id,
            name: data.name || "Unnamed Exercise",
            muscleGroup: getCategoryFromMuscle(String(rawMuscle)),
            equipment: data.equipment || "None",
            difficulty: data.difficulty || "intermediate",
          };
        });
        setLibrary(fetched);

        if (initialExerciseRefs && initialExerciseRefs.length > 0) {
          const byId = new Map(fetched.map((e) => [e.id, e]));
          const hydrated: CreateWorkoutExercise[] = [];
          for (const ref of initialExerciseRefs) {
            const ex = byId.get(ref.exerciseId);
            if (!ex) continue;
            hydrated.push({
              ...ex,
              sets: ref.targetSets != null ? String(ref.targetSets) : "",
              repsRange: ref.targetReps ?? "",
            });
          }
          setWorkoutExercises(hydrated);
        }
      } catch (e) {
        console.error("Error fetching exercises:", e);
        setLibrary([]);
      } finally {
        setLoadingLibrary(false);
      }
    };
    fetchExercises();
    // Intentionally only runs once on mount; initialExerciseRefs is captured.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const hasCategoryFilter = selectedCategories.size > 0;
    return library.filter((ex) => {
      if (hasCategoryFilter && !selectedCategories.has(ex.muscleGroup)) {
        return false;
      }
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q)
      );
    });
  }, [library, searchQuery, selectedCategories]);

  const libraryCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of library) {
      counts[ex.muscleGroup] = (counts[ex.muscleGroup] ?? 0) + 1;
    }
    return counts;
  }, [library]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const addFromLibrary = (ex: Exercise) => {
    setWorkoutExercises((prev) => [...prev, toCreateWorkoutExercise(ex)]);
  };

  const removeAt = (index: number) => {
    setWorkoutExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: keyof CreateWorkoutExercise, value: unknown) => {
    setWorkoutExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const onDragStartRow = (index: number) => setDraggedIndex(index);
  const onDragOverRow = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setWorkoutExercises((prev) => {
      const next = [...prev];
      const [item] = next.splice(draggedIndex, 1);
      next.splice(index, 0, item);
      return next;
    });
    setDraggedIndex(index);
  };
  const onDragEndRow = () => setDraggedIndex(null);

  const onExerciseInputsBlur = (rowIndex: number) => {
    queueMicrotask(() => {
      const el = document.activeElement;
      if (
        el instanceof HTMLInputElement &&
        el.dataset.inputsRow === String(rowIndex)
      ) {
        return;
      }
      setInputFocusRowIndex((prev) => (prev === rowIndex ? null : prev));
    });
  };

  const onDropBuilder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-primary/5");
    const raw = e.dataTransfer.getData("exercise");
    if (raw) {
      try {
        const ex = JSON.parse(raw) as Exercise;
        addFromLibrary(ex);
      } catch {
        /* ignore */
      }
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const name = workoutName.trim();
    if (!name) {
      setNameError(true);
      workoutNameInputRef.current?.focus();
      return;
    }
    setNameError(false);
    try {
      setSaving(true);
      const now = Timestamp.now();
      const mappedExercises = workoutExercises.map((exercise, idx) => ({
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        order: idx + 1,
        targetSets: targetSetsFromForm(exercise.sets),
        targetReps: exercise.repsRange || "",
      }));
      if (existingWorkoutId) {
        await updateDoc(doc(db, "workouts", existingWorkoutId), {
          name,
          exercises: mappedExercises,
          estimatedDuration: mappedExercises.length * 5,
          updatedAt: now,
        });
      } else {
        await addDoc(collection(db, "workouts"), {
          name,
          description: "",
          createdBy: "admin",
          createdByRole: "admin",
          exercises: mappedExercises,
          tags: [],
          estimatedDuration: mappedExercises.length * 5,
          createdAt: now,
          updatedAt: now,
        });
      }
      router.push(redirectTo);
    } catch (err) {
      console.error("Error saving workout:", err);
      alert("Failed to save workout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return {
    workoutName,
    setWorkoutName,
    nameError,
    setNameError,
    workoutNameInputRef,

    workoutExercises,
    addFromLibrary,
    removeAt,
    updateExercise,

    library,
    loadingLibrary,
    filteredLibrary,
    libraryCategoryCounts,

    searchQuery,
    setSearchQuery,
    selectedCategories,
    setSelectedCategories,
    toggleCategory,

    draggedIndex,
    onDragStartRow,
    onDragOverRow,
    onDragEndRow,
    onDropBuilder,

    inputFocusRowIndex,
    setInputFocusRowIndex,
    onExerciseInputsBlur,

    saving,
    handleSave,
  };
}
