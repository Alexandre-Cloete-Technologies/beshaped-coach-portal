"use client";

import { Search, Edit, Trash2, Dumbbell, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import PageHeader from "../components/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requireServerResult } from "@/lib/firebase/serverResult";
import ExerciseEditModal, { ExerciseEditValues } from "../components/ExerciseEditModal";
import AnatomyGifPicker from "../components/AnatomyGifPicker";

import { useToast } from "@/lib/toast";
interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  musclesInvolved?: string[];
  secondaryMuscles?: string[];
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description?: string;
  instructions?: string[];
  videoUrl?: string;
  anatomyExerciseWalkthrough?: string;
  createdAt?: Date;
}

interface ExerciseFormData {
  name: string;
  description: string;
  instructions: {
    setup: string;
    posture: string;
    execution: string;
    breathing: string;
    control: string;
  };
  videoUrl: string;
  anatomyExerciseWalkthrough: string;
  thumbnailUrl: string;
  anatomicalIllustration: string;
  musclesInvolved: string[];
  secondaryMuscles: string[];
  equipment: string;
  category: string;
  tips: string[];
}

const emptyFormData: ExerciseFormData = {
  name: "",
  description: "",
  instructions: {
    setup: "",
    posture: "",
    execution: "",
    breathing: "",
    control: "",
  },
  videoUrl: "",
  anatomyExerciseWalkthrough: "",
  thumbnailUrl: "",
  anatomicalIllustration: "",
  musclesInvolved: [],
  secondaryMuscles: [],
  equipment: "",
  category: "",
  tips: [],
};

const equipmentOptions = [
  "Barbell", "Dumbbells", "Cable Machine", "Machine", "Bodyweight", 
  "Kettlebell", "Resistance Bands", "Medicine Ball", "Pull-up Bar", "Bench", "Other"
];


const muscleCategoryDetails: Array<{ category: string; muscles: string[] }> = [
  { category: "Chest", muscles: ["Upper chest", "Chest"] },
  { category: "Back", muscles: ["Back","Traps", "Upper back", "Mid back", "Lats", "Erectors" ] },
  { category: "Shoulders", muscles: ["Front delts", "Side delts", "Rear delts"] },
  { category: "Arms", muscles: ["Biceps", "Triceps", "Forearms"] },
  { category: "Core", muscles: ["Abs"] },
  { category: "Cardio", muscles: ["Cardio"] },
  { category: "Legs", muscles: ["Quads", "Hamstrings", "Calves", "Glutes"] },
  { category: "Neck", muscles: ["Neck"] },
];

// Define muscle group order and icons
const muscleGroupOrder = [
  "Chest",
  "Back", 
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Full Body",
  "Cardio",
  "Neck",
  "Other"
];

function getDisplayGroup(ex: Exercise): string {
  return muscleGroupOrder.includes(ex.muscleGroup) ? ex.muscleGroup : "Other";
}

// Map specific muscles to broader categories
const muscleToCategory: Record<string, string> = {
  // Chest
  "chest": "Chest",
  "pectorals": "Chest",
  "pecs": "Chest",
  "upper chest": "Chest",
  "lower chest": "Chest",
  
  // Back
  "back": "Back",
  "lats": "Back",
  "latissimus dorsi": "Back",
  "rhomboids": "Back",
  "traps": "Back",
  "trapezius": "Back",
  "lower back": "Back",
  "erector spinae": "Back",
  "erectors": "Back",
  "rear delts": "Back",
  "upper back": "Back",
  "mid back": "Back",
  
  // Shoulders
  "shoulders": "Shoulders",
  "delts": "Shoulders",
  "deltoids": "Shoulders",
  "front delts": "Shoulders",
  "side delts": "Shoulders",
  "lateral delts": "Shoulders",
  "anterior deltoid": "Shoulders",
  "posterior deltoid": "Shoulders",
  "rotator cuff": "Shoulders",
  
  // Arms
  "arms": "Arms",
  "biceps": "Arms",
  "triceps": "Arms",
  "forearms": "Arms",
  "brachialis": "Arms",
  "bicep": "Arms",
  "tricep": "Arms",
  "forearm": "Arms",
  "wrists": "Arms",
  
  // Legs
  "legs": "Legs",
  "quads": "Legs",
  "quadriceps": "Legs",
  "hamstrings": "Legs",
  "glutes": "Legs",
  "gluteus": "Legs",
  "calves": "Legs",
  "calf": "Legs",
  "hip flexors": "Legs",
  "adductors": "Legs",
  "abductors": "Legs",
  "thighs": "Legs",
  "lower body": "Legs",
  
  // Core
  "core": "Core",
  "abs": "Core",
  "abdominals": "Core",
  "obliques": "Core",
  "lower abs": "Core",
  "upper abs": "Core",
  "transverse abdominis": "Core",
  "hip": "Core",
  "pelvis": "Core",
  
  // Full Body
  "full body": "Full Body",
  "compound": "Full Body",
  "total body": "Full Body",
  "whole body": "Full Body",
  
  // Cardio
  "cardio": "Cardio",
  "cardiovascular": "Cardio",
  "heart": "Cardio",
  "conditioning": "Cardio",
  "endurance": "Cardio",

  // Neck
  "neck": "Neck",
  "cervical": "Neck",
};

// Function to get category from muscle name
const getCategoryFromMuscle = (muscle: string): string => {
  if (!muscle) return "Other";
  
  const normalized = muscle.toLowerCase().trim();
  
  // Direct match
  if (muscleToCategory[normalized]) {
    return muscleToCategory[normalized];
  }
  
  // Check if any key is contained in the muscle string
  for (const [key, category] of Object.entries(muscleToCategory)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }
  
  // Check if muscle string contains any category name directly
  for (const category of muscleGroupOrder) {
    if (normalized.includes(category.toLowerCase())) {
      return category;
    }
  }
  
  return "Other";
};

function normalizeMuscleish(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value) && value.length > 0) {
    return normalizeMuscleish(value[0]);
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const n = o.name ?? o.title ?? o.slug ?? o.label;
    if (typeof n === "string" && n) return n;
    if (typeof o.toString === "function") {
      const s = (o as { toString: () => string }).toString();
      if (s && s !== "[object Object]") return s;
    }
  }
  return "";
}

const MUSCLE_FIELD_KEYS = [
  "musclesInvolved",
  "primaryMuscles",
  "secondaryMuscles",
  "muscleGroup",
  "muscle_group",
  "muscle",
  "muscles",
  "target",
  "bodyPart",
  "primaryMuscle",
  "primary_muscle",
  "muscles_involved",
  "muscleGroups",
  "muscle_groups",
  "category",
  "primaryGroup",
] as const;

const getRawMuscleFromExerciseData = (data: Record<string, unknown>): string => {
  for (const key of MUSCLE_FIELD_KEYS) {
    const s = normalizeMuscleish(data[key]);
    if (s) return s;
  }
  return "";
};

export default function ExercisesPage() {
  const toast = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  // A failed load shows an error with Retry, never placeholder exercises.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => new Set());

  // Add exercise modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<ExerciseFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);

  // Edit exercise modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [updating, setUpdating] = useState(false);

  // Delete exercise modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch exercises from Firebase
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const exercisesCollection = collection(db, "exercises");
        const exercisesSnapshot = requireServerResult(await getDocs(exercisesCollection));
        
        const fetchedExercises: Exercise[] = exercisesSnapshot.docs.map((doc) => {
          const data = doc.data();
          const rawMuscle = getRawMuscleFromExerciseData(data as Record<string, unknown>);
          
          // Use helper to categorize specific muscles (e.g. "Biceps" -> "Arms")
          const muscleCategory = getCategoryFromMuscle(String(rawMuscle));
          
          // Log for debugging (helpful to see what fields are available)
          // console.log("Exercise:", data.name, "Raw Muscle:", rawMuscle, "Category:", muscleCategory);
          
          return {
            id: doc.id,
            name: data.name || "Unnamed Exercise",
            muscleGroup: muscleCategory, // Normalized category
            musclesInvolved: Array.isArray(data.musclesInvolved) ? data.musclesInvolved : (Array.isArray(data.primaryMuscles) ? data.primaryMuscles : []),
            secondaryMuscles: Array.isArray(data.secondaryMuscles) ? data.secondaryMuscles : [],
            equipment: data.equipment || "None",
            difficulty: data.difficulty || "intermediate",
            description: data.description,
            instructions: data.instructions,
            videoUrl: data.videoUrl,
            anatomyExerciseWalkthrough: data.anatomyExerciseWalkthrough || data.anatomyVideoUrl,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
          };
        });
        
        setExercises(fetchedExercises);
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setExercises([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [reloadKey]);

  const exerciseCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ex of exercises) {
      const g = getDisplayGroup(ex);
      counts[g] = (counts[g] ?? 0) + 1;
    }
    return counts;
  }, [exercises]);

  // Group exercises by muscle group (search + category filter match workout editor)
  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    muscleGroupOrder.forEach((group) => {
      groups[group] = [];
    });

    const hasCategoryFilter = selectedCategories.size > 0;
    let working = hasCategoryFilter
      ? exercises.filter((ex) => selectedCategories.has(getDisplayGroup(ex)))
      : exercises;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      working = working.filter(
        (ex) =>
          ex.name.toLowerCase().includes(q) ||
          ex.muscleGroup.toLowerCase().includes(q) ||
          ex.equipment.toLowerCase().includes(q)
      );
    }

    working.forEach((exercise) => {
      const group = getDisplayGroup(exercise);
      groups[group].push(exercise);
    });

    return groups;
  }, [exercises, searchQuery, selectedCategories]);

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


  // Form handlers
  const handleInputChange = (field: keyof ExerciseFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  /** One click cycles a muscle: not used → primary → secondary → not used. A muscle is never both. */
  const cycleMuscle = (muscle: string) => {
    setFormData((prev) => {
      if (prev.musclesInvolved.includes(muscle)) {
        return {
          ...prev,
          musclesInvolved: prev.musclesInvolved.filter((m) => m !== muscle),
          secondaryMuscles: [...prev.secondaryMuscles, muscle],
        };
      }
      if (prev.secondaryMuscles.includes(muscle)) {
        return { ...prev, secondaryMuscles: prev.secondaryMuscles.filter((m) => m !== muscle) };
      }
      return { ...prev, musclesInvolved: [...prev.musclesInvolved, muscle] };
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setFormData(emptyFormData);
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingExercise(null);
    setUpdating(false);
  };

  const openDeleteModal = (exercise: Exercise) => {
    setDeletingExercise(exercise);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeletingExercise(null);
  };

  const handleDeleteExercise = async () => {
    if (!deletingExercise) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "exercises", deletingExercise.id));
      setExercises((prev) => prev.filter((ex) => ex.id !== deletingExercise.id));
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast.error("Failed to delete exercise. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateExercise = async (values: ExerciseEditValues) => {
    if (!editingExercise) return;

    try {
      setUpdating(true);
      const exerciseRef = doc(db, "exercises", editingExercise.id);
      await updateDoc(exerciseRef, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        equipment: values.equipment || "None",
        difficulty: values.difficulty,
        videoUrl: values.videoUrl.trim() || null,
        anatomyExerciseWalkthrough: values.anatomyExerciseWalkthrough?.trim() || null,
        muscleGroup: values.muscleGroup,
        musclesInvolved: values.musclesInvolved,
        secondaryMuscles: values.secondaryMuscles,
        updatedAt: serverTimestamp(),
      });

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === editingExercise.id
            ? {
                ...ex,
                name: values.name.trim(),
                description: values.description.trim() || ex.description,
                equipment: values.equipment || "None",
                difficulty: values.difficulty,
                videoUrl: values.videoUrl.trim() || undefined,
                anatomyExerciseWalkthrough: values.anatomyExerciseWalkthrough?.trim() || undefined,
                muscleGroup: values.muscleGroup,
                musclesInvolved: values.musclesInvolved,
                secondaryMuscles: values.secondaryMuscles,
              }
            : ex
        )
      );

      closeEditModal();
    } catch (error) {
      console.error("Error updating exercise:", error);
      toast.error("Failed to update exercise. Please try again.");
      setUpdating(false);
    }
  };

  const handleSaveExercise = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter an exercise name");
      return;
    }
    
    try {
      setSaving(true);
      await addDoc(collection(db, "exercises"), {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: "coach",
      });
      
      // Refresh exercises list
      const exercisesSnapshot = await getDocs(collection(db, "exercises"));
      const fetchedExercises: Exercise[] = exercisesSnapshot.docs.map((doc) => {
        const data = doc.data();
        const rawMuscle = getRawMuscleFromExerciseData(data as Record<string, unknown>);
        const muscleCategory = getCategoryFromMuscle(String(rawMuscle));
        return {
          id: doc.id,
          name: data.name || "Unnamed Exercise",
          muscleGroup: muscleCategory,
          musclesInvolved: Array.isArray(data.musclesInvolved) ? data.musclesInvolved : (Array.isArray(data.primaryMuscles) ? data.primaryMuscles : []),
          secondaryMuscles: Array.isArray(data.secondaryMuscles) ? data.secondaryMuscles : [],
          equipment: data.equipment || "None",
          difficulty: data.difficulty || "intermediate",
          description: data.description,
          instructions: data.instructions,
          videoUrl: data.videoUrl,
          anatomyExerciseWalkthrough: data.anatomyExerciseWalkthrough || data.anatomyVideoUrl,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
        };
      });
      setExercises(fetchedExercises);
      closeModal();
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast.error("Failed to save exercise. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // const getDifficultyBadge = (difficulty: string) => {
  //   switch (difficulty) {
  //     case "beginner":
  //       return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  //     case "intermediate":
  //       return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
  //     case "advanced":
  //       return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  //     default:
  //       return "bg-muted text-muted-foreground";
  //   }
  // };

  const totalExercises = exercises.length;
  // One table, ordered by muscle group (the chips' order) and then by name.
  const visibleExercises = muscleGroupOrder.flatMap((group) =>
    [...groupedExercises[group]].sort((a, b) => a.name.localeCompare(b.name))
  );
  const filteredTotal = visibleExercises.length;
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCategories.size > 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          <PageHeader title="Exercises" description={`${totalExercises} exercises in your library`} />

          {/* Toolbar */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border mb-6 flex flex-col gap-0">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder="Search exercises by name, muscle, or equipment..."
                />
              </div>

              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                {/* Add Button */}
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 bg-action hover:bg-action-hover text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-colors"
                >
                  Add Exercise
                </button>
              </div>
            </div>
            <div
              className="mt-3 flex flex-wrap gap-1"
              role="group"
              aria-label="Filter by muscle group"
            >
              {(() => {
                const allActive = selectedCategories.size === 0;
                return (
                  <button
                    key="all"
                    type="button"
                    onClick={() => setSelectedCategories(new Set())}
                    aria-pressed={allActive}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      allActive
                        ? "border-primary bg-beshaped-green text-primary-foreground"
                        : "border-border bg-muted/50 text-foreground hover:bg-muted hover:border-foreground/20"
                    }`}
                  >
                    All
                    <span className="ml-1 tabular-nums opacity-70">({exercises.length})</span>
                  </button>
                );
              })()}
              {muscleGroupOrder.map((cat) => {
                const isActive = selectedCategories.has(cat);
                const count = exerciseCategoryCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={isActive}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-beshaped-green text-primary-foreground"
                        : "border-border bg-muted/50 text-foreground hover:bg-muted hover:border-foreground/20"
                    }`}
                  >
                    {cat}
                    <span className="ml-1 tabular-nums opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter / search results info */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Found {filteredTotal} exercise{filteredTotal !== 1 ? "s" : ""}
                {searchQuery.trim() ? ` matching "${searchQuery}"` : ""}
                {selectedCategories.size > 0
                  ? `${searchQuery.trim() ? " · " : ""}in ${Array.from(selectedCategories).join(", ")}`
                  : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategories(new Set());
                }}
                className="text-primary hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Grouped Exercises */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading exercises...
            </div>
          ) : loadError ? (
            <div role="alert" className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-card-foreground">Couldn&apos;t load the exercise library.</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-4 h-9 px-4 rounded-lg bg-action text-white text-sm font-medium hover:bg-action-hover transition-colors"
              >
                Try again
              </button>
            </div>
          ) : exercises.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-card-foreground">No exercises yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first exercise to start building workouts and programs.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-4 h-9 px-4 rounded-lg bg-action text-white text-sm font-medium hover:bg-action-hover transition-colors"
              >
                Add exercise
              </button>
            </div>
          ) : (
            filteredTotal > 0 && (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Exercise
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Muscle group
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Equipment
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleExercises.map((exercise) => {
                      // Specific muscles under the name, unless they only repeat the muscle-group column.
                      const group = getDisplayGroup(exercise);
                      const muscles = (exercise.musclesInvolved ?? [])
                        .filter((m) => m.toLowerCase() !== group.toLowerCase())
                        .join(", ");
                      return (
                        <tr
                          key={exercise.id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <Link href={`/exercises/${exercise.id}`} className="flex items-center gap-2.5">
                              <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Dumbbell className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-card-foreground truncate">{exercise.name}</p>
                                {muscles && <p className="text-xs text-muted-foreground truncate">{muscles}</p>}
                              </div>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/exercises/${exercise.id}`} className="block">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-foreground">
                                {group}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/exercises/${exercise.id}`} className="block text-sm text-card-foreground">
                              {exercise.equipment}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(exercise)}
                                className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                title="Edit"
                                aria-label={`Edit ${exercise.name}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(exercise)}
                                className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                                aria-label={`Delete ${exercise.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Empty State */}
          {!loading && !loadError && exercises.length > 0 && filteredTotal === 0 && hasActiveFilters && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">
                {searchQuery.trim() && selectedCategories.size > 0
                  ? `No exercises match your search and selected muscle groups.`
                  : searchQuery.trim()
                    ? `No exercises found matching "${searchQuery}".`
                    : selectedCategories.size > 0
                      ? `No exercises in ${Array.from(selectedCategories).join(", ")}.`
                      : "No exercises match the current filters."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategories(new Set());
                }}
                className="text-primary hover:underline text-sm"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-border max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Add exercise</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Only the name is required. You can add the rest later.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Form Body: three sections, most important first */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Basics */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-card-foreground">Basics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
                  <div>
                    <label htmlFor="new-exercise-name" className="block text-xs font-medium text-card-foreground mb-1.5">
                      Name <span className="text-muted-foreground">(required)</span>
                    </label>
                    <input
                      id="new-exercise-name"
                      type="text"
                      autoFocus
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="e.g. Barbell Bench Press"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-exercise-equipment" className="block text-xs font-medium text-card-foreground mb-1.5">
                      Equipment
                    </label>
                    <select
                      id="new-exercise-equipment"
                      value={formData.equipment}
                      onChange={(e) => handleInputChange("equipment", e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    >
                      <option value="">Select equipment</option>
                      {equipmentOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="new-exercise-description" className="block text-xs font-medium text-card-foreground mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="new-exercise-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                    placeholder="Brief description of the exercise…"
                  />
                </div>
              </section>

              {/* Muscles: one list; a click cycles not used → primary → secondary */}
              <section className="space-y-3 border-t border-border pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-card-foreground">Muscles worked</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-[3px] bg-action" aria-hidden />
                      Primary
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-[3px] border border-beshaped-dark-green bg-beshaped-green/15" aria-hidden />
                      Secondary
                    </span>
                    <span>Click once for primary, twice for secondary.</span>
                  </div>
                </div>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {muscleCategoryDetails.map(({ category, muscles }) => (
                    <div key={category} className="flex items-start gap-3 px-3 py-2">
                      <p className="w-20 shrink-0 pt-1 text-sm font-medium text-card-foreground">{category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {muscles.map((muscle) => {
                          const role = formData.musclesInvolved.includes(muscle)
                            ? "primary"
                            : formData.secondaryMuscles.includes(muscle)
                              ? "secondary"
                              : null;
                          return (
                            <button
                              key={`${category}-${muscle}`}
                              type="button"
                              onClick={() => cycleMuscle(muscle)}
                              aria-label={`${muscle}: ${role ?? "not used"}`}
                              className={`px-3 py-1 rounded-sm border text-xs transition-colors ${
                                role === "primary"
                                  ? "border-action bg-action text-white"
                                  : role === "secondary"
                                    ? "border-beshaped-dark-green bg-beshaped-green/15 text-beshaped-dark-green dark:text-beshaped-green"
                                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              {muscle}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Media */}
              <section className="space-y-4 border-t border-border pt-5">
                <h3 className="text-sm font-semibold text-card-foreground">Media</h3>
                <div>
                  <label htmlFor="new-exercise-video" className="block text-xs font-medium text-card-foreground mb-1.5">
                    Video URL
                  </label>
                  <input
                    id="new-exercise-video"
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => handleInputChange("videoUrl", e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="https://…"
                  />
                </div>
                <AnatomyGifPicker
                  value={formData.anatomyExerciseWalkthrough}
                  onChange={(url) => handleInputChange("anatomyExerciseWalkthrough", url)}
                  label="Anatomy walkthrough"
                />
              </section>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleSaveExercise} disabled={saving || !formData.name.trim()}>
                {saving ? "Saving…" : "Save exercise"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-semibold text-card-foreground">Delete Exercise</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to delete{" "}
                <span className="font-medium text-card-foreground">
                  &ldquo;{deletingExercise.name}&rdquo;
                </span>
                ?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/20">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="h-10 px-4 rounded-lg border border-border bg-card text-xs text-card-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExercise}
                disabled={deleting}
                className="h-10 px-5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Exercise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      <ExerciseEditModal
        isOpen={showEditModal}
        exercise={editingExercise}
        muscleCategoryDetails={muscleCategoryDetails}
        saving={updating}
        onClose={closeEditModal}
        onSave={handleUpdateExercise}
      />
    </div>
  );
}
