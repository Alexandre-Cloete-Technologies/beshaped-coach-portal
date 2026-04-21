"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Dumbbell, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Breadcrumbs from "../components/Breadcrumbs";
import WorkoutEditorModal, { ModalExercise } from "../components/WorkoutEditorModal";
import ConfirmModal from "../components/ConfirmModal";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Exercise, getCategoryFromMuscle, muscleGroupOrder } from "./lib/exercise";

interface WorkoutTemplateExercise {
  exerciseId?: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: string;
}

interface SavedWorkout {
  id: string;
  name: string;
  exercises: number;
  description?: string;
  templateExercises?: WorkoutTemplateExercise[];
}

function templateExercisesToModal(
  templateExercises: WorkoutTemplateExercise[] | undefined,
  exerciseLibrary: Exercise[]
): ModalExercise[] {
  if (!templateExercises?.length) return [];
  return templateExercises.map((ex, index) => {
    const exerciseId = ex.exerciseId || "";
    const fromLib = exerciseLibrary.find((e) => e.id === exerciseId);
    return {
      id: exerciseId || `row-${index}`,
      name: ex.exerciseName || "Exercise",
      muscleGroup: fromLib?.muscleGroup || "Other",
      musclesInvolved: fromLib?.musclesInvolved,
      equipment: fromLib?.equipment || "Unknown",
      difficulty: fromLib?.difficulty || "intermediate",
      sets: ex.targetSets ?? 3,
      repsRange: ex.targetReps ?? "8-12",
    };
  });
}

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorName, setEditorName] = useState("New workout");
  const [editorExercises, setEditorExercises] = useState<ModalExercise[]>([]);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SavedWorkout | null>(null);

  const fetchWorkouts = useCallback(async () => {
    try {
      setLoadingWorkouts(true);
      setFetchError(null);
      const snapshot = await getDocs(collection(db, "workouts"));
      if (snapshot.empty) {
        setWorkouts([]);
        return;
      }

      const list: SavedWorkout[] = snapshot.docs.map((workoutDoc) => {
        const data = workoutDoc.data() as Record<string, unknown>;
        const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];
        const exercisesCount = rawExercises.length;
        const templateExercises: WorkoutTemplateExercise[] = rawExercises.map((exercise) => {
          const exerciseData =
            exercise && typeof exercise === "object" ? (exercise as Record<string, unknown>) : {};
          return {
            exerciseId: typeof exerciseData.exerciseId === "string" ? exerciseData.exerciseId : undefined,
            exerciseName:
              typeof exerciseData.exerciseName === "string" && exerciseData.exerciseName.trim()
                ? exerciseData.exerciseName.trim()
                : typeof exerciseData.name === "string" && exerciseData.name.trim()
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
          };
        });
        return {
          id: workoutDoc.id,
          name:
            typeof data.name === "string" && data.name.trim()
              ? data.name.trim()
              : "Untitled Workout",
          exercises: exercisesCount,
          description: typeof data.description === "string" ? data.description : "",
          templateExercises,
        };
      });

      setWorkouts(list);
    } catch (err) {
      console.error("Error fetching workouts:", err);
      setFetchError("Could not load workouts.");
      setWorkouts([]);
    } finally {
      setLoadingWorkouts(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));
        if (exercisesSnapshot.empty) {
          setExercises([]);
          return;
        }
        const fetched: Exercise[] = exercisesSnapshot.docs.map((d) => {
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
            musclesInvolved: Array.isArray(data.musclesInvolved)
              ? data.musclesInvolved
              : Array.isArray(data.primaryMuscles)
                ? data.primaryMuscles
                : [],
            equipment: data.equipment || "None",
            difficulty: data.difficulty || "intermediate",
          };
        });
        setExercises(fetched);
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setExercises([]);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, []);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, ModalExercise[]> = {};
    muscleGroupOrder.forEach((g) => {
      groups[g] = [];
    });
    exercises.forEach((exercise) => {
      const group = muscleGroupOrder.includes(exercise.muscleGroup) ? exercise.muscleGroup : "Other";
      groups[group].push({
        ...exercise,
        difficulty: exercise.difficulty,
      });
    });
    return groups;
  }, [exercises]);

  const filteredWorkouts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workouts;
    return workouts.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
    );
  }, [workouts, searchQuery]);

  const openEditWorkout = (w: SavedWorkout) => {
    setEditingWorkoutId(w.id);
    setEditorName(w.name);
    setEditorExercises(templateExercisesToModal(w.templateExercises, exercises));
    setEditorOpen(true);
  };

  const handleDeleteWorkout = async () => {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, "workouts", deleteTarget.id));
    setDeleteTarget(null);
    await fetchWorkouts();
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen w-[calc(100%-220px)]">
        <div className="p-2 w-full max-w-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2 ">
            <div>
              <Breadcrumbs items={[{ label: "Workouts" }]} />
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Workouts</h1>
              <p className="text-muted-foreground max-w-3xl">
                Build reusable workout templates from your exercise library. Saved workouts appear in
                the program builder when you assign training days.
              </p>
            </div>
            <Link
              href="/workouts/create"
              className="flex items-center justify-center gap-2 shrink-0 bg-beshaped-green hover:bg-beshaped-dark-green text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all"
            >
              Create workout
            </Link>
          </div>

          <div className="bg-card p-3  shadow-sm border border-border mb-4">
            <div className="relative w-full max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 py-2 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                placeholder="Search workouts..."
              />
            </div>
          </div>

          {fetchError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 mb-6">
              {fetchError}
            </div>
          )}

          {loadingWorkouts ? (
            <div className="text-center py-16 text-muted-foreground text-sm">Loading workouts…</div>
          ) : filteredWorkouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-8 py-16 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-4">
                <Dumbbell className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-semibold text-card-foreground mb-2">
                {searchQuery.trim() ? "No matching workouts" : "No workouts yet"}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {searchQuery.trim()
                  ? "Try a different search term."
                  : "Create your first workout template to reuse across programs."}
              </p>
              {!searchQuery.trim() && (
                <Link
                  href="/workouts/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create workout
                </Link>
              )}
            </div>
          ) : (
            <div className="w-full overflow-x-auto border border-border bg-card shadow-sm">
              <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="px-2 py-1 align-middle font-semibold text-muted-foreground w-[34%]">
                      Name
                    </th>
                    <th className="px-2 py-1 align-middle font-semibold text-muted-foreground w-[42%]">
                      Description
                    </th>
                    <th className="px-2 py-1 align-middle font-semibold text-muted-foreground w-[12%]">
                      Exercises
                    </th>
                    <th className="px-2 py-1 align-middle font-semibold text-muted-foreground w-[12%] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkouts.map((w) => (
                    <tr
                      key={w.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-2 py-0.5 align-middle">
                        <Link
                          href={`/workouts/${w.id}`}
                          className="font-medium text-card-foreground hover:text-primary hover:underline"
                        >
                          {w.name}
                        </Link>
                      </td>
                      <td className="px-2 py-0.5 align-middle text-muted-foreground">
                        <span className="line-clamp-2 break-words" title={w.description || undefined}>
                          {w.description?.trim() ? w.description : "—"}
                        </span>
                      </td>
                      <td className="px-2 py-0.5 align-middle text-card-foreground tabular-nums">{w.exercises}</td>
                      <td className="px-2 py-0.5 align-middle text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditWorkout(w)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(w)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <WorkoutEditorModal
        isOpen={editorOpen}
        workoutName={editorName}
        exercises={editorExercises}
        groupedExercises={groupedExercises}
        muscleGroupOrder={muscleGroupOrder}
        loadingExercises={loadingExercises}
        existingWorkoutId={editingWorkoutId}
        onClose={() => {
          setEditorOpen(false);
          setEditingWorkoutId(null);
        }}
        onTemplateSaved={fetchWorkouts}
        onDelete={
          editingWorkoutId
            ? async () => {
                await deleteDoc(doc(db, "workouts", editingWorkoutId));
                setEditorOpen(false);
                setEditingWorkoutId(null);
                await fetchWorkouts();
              }
            : undefined
        }
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteWorkout}
        title="Delete workout"
        message={
          deleteTarget ? (
            <>
              <p className="mb-1">
                Delete <span className="font-semibold text-card-foreground">{deleteTarget.name}</span>?
              </p>
              <p className="text-xs text-muted-foreground">Programs that reference this template may need to be updated.</p>
            </>
          ) : null
        }
        confirmLabel="Delete"
      />
    </div>
  );
}
