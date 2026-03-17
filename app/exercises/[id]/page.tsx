"use client";

import {
  ArrowLeft,
  Save,
  ExternalLink,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import {
  muscleCategoryDetails,
  equipmentOptions,
  getCategoryFromMuscle,
} from "@/lib/exerciseConstants";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface ExerciseDetail {
  id: string;
  name: string;
  description: string;
  muscleGroup: string;
  musclesInvolved: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: Difficulty;
  videoUrl: string;
  formTextInstructions: string;
}

const getRawMuscleFromExerciseData = (data: Record<string, unknown>): string => {
  let rawMuscle =
    (data.musclesInvolved as string[])?.[0] ||
    (data.primaryMuscles as string[])?.[0] ||
    (data.secondaryMuscles as string[])?.[0] ||
    (data.muscleGroup as string) ||
    (data.muscle_group as string) ||
    (data.muscle as string) ||
    (data.muscles as string) ||
    (data.target as string) ||
    (data.bodyPart as string) ||
    (data.primaryMuscle as string) ||
    (data.primary_muscle as string) ||
    (data.muscles_involved as string) ||
    (data.category as string) ||
    "";

  if (Array.isArray(rawMuscle) && rawMuscle.length > 0) {
    rawMuscle = rawMuscle[0];
  } else if (rawMuscle && typeof rawMuscle === "object") {
    const muscleObj = rawMuscle as Record<string, unknown>;
    rawMuscle =
      (muscleObj.name as string) ||
      (muscleObj.title as string) ||
      (muscleObj.slug as string) ||
      (muscleObj.label as string) ||
      "";
  }

  return String(rawMuscle || "");
};

const sanitizeMuscles = (
  muscles: unknown,
  canonicalMap: Record<string, string>
): string[] => {
  if (!Array.isArray(muscles)) return [];
  const deduped = new Set<string>();
  muscles.forEach((muscle) => {
    const canonical = canonicalMap[String(muscle).toLowerCase().trim()];
    if (canonical) deduped.add(canonical);
  });
  return Array.from(deduped);
};

export default function ExerciseDetailPage() {
  const params = useParams();
  const exerciseId = params?.id as string;
  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonicalMuscleMap = muscleCategoryDetails.reduce<
    Record<string, string>
  >((acc, { muscles }) => {
    muscles.forEach((muscle) => {
      acc[muscle.toLowerCase()] = muscle;
    });
    return acc;
  }, {});

  useEffect(() => {
    const fetchExercise = async () => {
      if (!exerciseId) return;

      try {
        setLoading(true);
        setError(null);
        const exerciseRef = doc(db, "exercises", exerciseId);
        const exerciseSnap = await getDoc(exerciseRef);

        if (!exerciseSnap.exists()) {
          setError("Exercise not found");
          setExercise(null);
          return;
        }

        const data = exerciseSnap.data();
        const rawMuscle = getRawMuscleFromExerciseData(data);
        const muscleCategory = getCategoryFromMuscle(String(rawMuscle));

        setExercise({
          id: exerciseSnap.id,
          name: (data.name as string) || "Unnamed Exercise",
          description: (data.description as string) || "",
          muscleGroup: muscleCategory,
          musclesInvolved: sanitizeMuscles(
            data.musclesInvolved ?? data.primaryMuscles,
            canonicalMuscleMap
          ),
          secondaryMuscles: sanitizeMuscles(
            data.secondaryMuscles,
            canonicalMuscleMap
          ),
          equipment: (data.equipment as string) || "",
          difficulty: (data.difficulty as Difficulty) || "intermediate",
          videoUrl: (data.videoUrl as string) || "",
          formTextInstructions: (data.formTextInstructions as string) || "",
        });
      } catch (err) {
        console.error("Error fetching exercise:", err);
        setError("Failed to load exercise");
        setExercise(null);
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [exerciseId]);

  const handleChange = <K extends keyof ExerciseDetail>(
    field: K,
    value: ExerciseDetail[K]
  ) => {
    if (!exercise) return;
    setExercise((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const toggleMuscle = (muscle: string, isPrimary: boolean) => {
    if (!exercise) return;
    const field = isPrimary ? "musclesInvolved" : "secondaryMuscles";
    const current = exercise[field];
    const next = current.includes(muscle)
      ? current.filter((m) => m !== muscle)
      : [...current, muscle];
    handleChange(field, next);
  };

  const resolveMuscleGroup = (
    musclesInvolved: string[],
    secondaryMuscles: string[],
    fallback: string
  ) => {
    const first = musclesInvolved[0] || secondaryMuscles[0] || "";
    if (!first) return fallback || "Other";
    const normalized = first.toLowerCase().trim();
    for (const { category, muscles } of muscleCategoryDetails) {
      if (
        category.toLowerCase() === normalized ||
        muscles.some((m) => m.toLowerCase() === normalized)
      ) {
        return category;
      }
    }
    return fallback || "Other";
  };

  const handleSave = async () => {
    if (!exercise) return;
    if (!exercise.name.trim()) {
      alert("Please enter an exercise name");
      return;
    }

    try {
      setSaving(true);
      const exerciseRef = doc(db, "exercises", exercise.id);
      await updateDoc(exerciseRef, {
        name: exercise.name.trim(),
        description: exercise.description.trim() || null,
        equipment: exercise.equipment || "None",
        difficulty: exercise.difficulty,
        videoUrl: exercise.videoUrl.trim() || null,
        muscleGroup: resolveMuscleGroup(
          exercise.musclesInvolved,
          exercise.secondaryMuscles,
          exercise.muscleGroup
        ),
        musclesInvolved: exercise.musclesInvolved,
        secondaryMuscles: exercise.secondaryMuscles,
        formTextInstructions: exercise.formTextInstructions.trim() || null,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error saving exercise:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "intermediate":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "advanced":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading exercise...</p>
        </main>
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">{error || "Exercise not found"}</p>
          <Link
            href="/exercises"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Exercise Library
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8 w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link
                href="/exercises"
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Back to exercises"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  {exercise.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${getDifficultyBadge(
                      exercise.difficulty
                    )}`}
                  >
                    {exercise.difficulty.charAt(0).toUpperCase() +
                      exercise.difficulty.slice(1)}
                  </span>
                  {exercise.equipment && (
                    <span className="text-sm text-muted-foreground">
                      {exercise.equipment}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Form */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
              {/* Exercise Name, Video URL & Equipment - same row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    value={exercise.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="e.g., Barbell Bench Press"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={exercise.videoUrl}
                    onChange={(e) => handleChange("videoUrl", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="https://..."
                  />
                  {exercise.videoUrl && (
                    <a
                      href={exercise.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open video
                    </a>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Equipment
                  </label>
                  <select
                    value={exercise.equipment}
                    onChange={(e) => handleChange("equipment", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                  >
                    <option value="">Select Equipment</option>
                    {equipmentOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-card-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={exercise.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-y"
                  placeholder="Brief description of the exercise..."
                />
              </div>

              {/* Form Text Instructions - Unique to detail page */}
              <div>
                <label className="block text-xs font-medium text-card-foreground mb-2">
                  Form Text Instructions
                </label>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Detailed written instructions for proper form. Use this to
                  document setup, posture, execution, breathing cues, and control
                  tips for your clients.
                </p>
                <textarea
                  value={exercise.formTextInstructions}
                  onChange={(e) =>
                    handleChange("formTextInstructions", e.target.value)
                  }
                  className="w-full min-h-[200px] px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-y"
                  placeholder="e.g., Setup: Lie flat on the bench with feet planted. Grip the bar slightly wider than shoulder-width...&#10;&#10;Posture: Retract your shoulder blades, create a slight arch in your lower back...&#10;&#10;Execution: Lower the bar to mid-chest with control. Press explosively while keeping your glutes on the bench..."
                />
              </div>

              {/* Primary Muscles & Secondary Muscles - side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Primary Muscles
                  </label>
                  <div className="space-y-3">
                    {muscleCategoryDetails.map(({ category, muscles }) => (
                      <div key={`primary-${category}`}>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                          {category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {muscles.map((muscle) => (
                            <button
                              key={`primary-${category}-${muscle}`}
                              type="button"
                              onClick={() => toggleMuscle(muscle, true)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                exercise.musclesInvolved.includes(muscle)
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {muscle}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Secondary Muscles
                  </label>
                  <div className="space-y-3">
                    {muscleCategoryDetails.map(({ category, muscles }) => (
                      <div key={`secondary-${category}`}>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                          {category}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {muscles.map((muscle) => (
                            <button
                              key={`secondary-${category}-${muscle}`}
                              type="button"
                              onClick={() => toggleMuscle(muscle, false)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                exercise.secondaryMuscles.includes(muscle)
                                  ? "bg-indigo-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {muscle}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
