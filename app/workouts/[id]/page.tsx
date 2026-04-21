"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import Breadcrumbs from "../../components/Breadcrumbs";
import Navbar from "../../components/Navbar";
import CreateWorkoutPage from "../../components/CreateWorkoutPage";
import { db } from "@/lib/firebase";

interface WorkoutExerciseRow {
  exerciseId: string;
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
    const exerciseId =
      typeof exerciseData.exerciseId === "string" ? exerciseData.exerciseId : "";
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
    return { exerciseId, exerciseName, targetSets, targetReps };
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

  if (loading && !workout) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="min-h-0 w-full flex-1 p-2">
          <div className="p-6 lg:p-2 w-full max-w-none">
            <Breadcrumbs
              items={[
                { label: "Workouts", href: "/workouts" },
                { label: "Loading…" },
              ]}
            />
            <div className="text-muted-foreground text-sm py-8">Loading workout…</div>
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !workout) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="min-h-0 w-full flex-1 p-2">
          <div className="p-6 lg:p-2 w-full max-w-none">
            <Breadcrumbs
              items={[
                { label: "Workouts", href: "/workouts" },
                { label: "Not found" },
              ]}
            />
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground mb-4">This workout could not be found.</p>
              <Link
                href="/workouts"
                className="text-primary font-medium hover:underline"
              >
                Back to workouts
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <CreateWorkoutPage
      existingWorkoutId={workout.id}
      initialWorkoutName={workout.name}
      initialExerciseRefs={workout.exercises.map((r) => ({
        exerciseId: r.exerciseId,
        targetSets: r.targetSets,
        targetReps: r.targetReps,
      }))}
      heading={workout.name}
      submitLabel="Save changes"
      breadcrumbs={[
        { label: "Workouts", href: "/workouts" },
        { label: workout.name },
      ]}
      redirectTo={`/workouts/${workout.id}`}
    />
  );
}
