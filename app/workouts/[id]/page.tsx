"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { Dumbbell } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Breadcrumbs from "../../components/Breadcrumbs";
import { db } from "@/lib/firebase";

interface WorkoutExerciseRow {
  exerciseName: string;
  targetSets?: number;
  targetReps?: string;
}

interface WorkoutDetail {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutExerciseRow[];
}

function parseWorkoutDoc(id: string, data: Record<string, unknown>): WorkoutDetail {
  const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];
  const rows: WorkoutExerciseRow[] = rawExercises.map((exercise) => {
    const exerciseData =
      exercise && typeof exercise === "object" ? (exercise as Record<string, unknown>) : {};
    const exerciseName =
      typeof exerciseData.exerciseName === "string" && exerciseData.exerciseName.trim()
        ? exerciseData.exerciseName.trim()
        : typeof exerciseData.name === "string" && exerciseData.name.trim()
          ? exerciseData.name.trim()
          : "Unnamed exercise";
    const targetSets =
      typeof exerciseData.targetSets === "number"
        ? exerciseData.targetSets
        : typeof exerciseData.sets === "number"
          ? exerciseData.sets
          : undefined;
    const targetReps =
      typeof exerciseData.targetReps === "string"
        ? exerciseData.targetReps
        : typeof exerciseData.repsRange === "string"
          ? exerciseData.repsRange
          : undefined;
    return { exerciseName, targetSets, targetReps };
  });

  return {
    id,
    name:
      typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Untitled workout",
    description: typeof data.description === "string" ? data.description : "",
    exercises: rows,
  };
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const snap = await getDoc(doc(db, "workouts", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setWorkout(null);
          setNotFound(true);
          return;
        }
        setWorkout(parseWorkoutDoc(snap.id, snap.data() as Record<string, unknown>));
      } catch (e) {
        console.error("Error loading workout:", e);
        if (!cancelled) {
          setWorkout(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const breadcrumbItems =
    loading && !workout
      ? [
          { label: "Workouts", href: "/workouts" },
          { label: "Loading…" },
        ]
      : notFound || !workout
        ? [
            { label: "Workouts", href: "/workouts" },
            { label: "Not found" },
          ]
        : [
            { label: "Workouts", href: "/workouts" },
            { label: workout.name },
          ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen w-[calc(100%-220px)]">
        <div className="p-8 w-full max-w-none">
          <Breadcrumbs items={breadcrumbItems} />

          {loading && !workout ? (
            <div className="text-muted-foreground text-sm py-8">Loading workout…</div>
          ) : notFound || !workout ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground mb-4">This workout could not be found.</p>
              <Link
                href="/workouts"
                className="text-primary font-medium hover:underline"
              >
                Back to workouts
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">{workout.name}</h1>
                {workout.description.trim() ? (
                  <p className="text-muted-foreground max-w-3xl">{workout.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Dumbbell className="w-4 h-4" />
                    {workout.exercises.length} exercise
                    {workout.exercises.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/40 font-semibold text-sm text-card-foreground">
                  Exercises
                </div>
                {workout.exercises.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No exercises in this template yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {workout.exercises.map((ex, index) => (
                      <li
                        key={`${ex.exerciseName}-${index}`}
                        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
                      >
                        <span className="font-medium text-card-foreground">
                          {index + 1}. {ex.exerciseName}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {ex.targetSets != null ? `${ex.targetSets} sets` : "—"}
                          {ex.targetReps ? ` · ${ex.targetReps} reps` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="mt-6 text-sm text-muted-foreground">
                Edit this template from the{" "}
                <Link href="/workouts" className="text-primary font-medium hover:underline">
                  workouts list
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
