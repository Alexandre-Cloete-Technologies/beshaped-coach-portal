"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { addDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import Sidebar from "../../components/Sidebar";
import Breadcrumbs from "../../components/Breadcrumbs";
import { ModalExercise } from "../../components/WorkoutEditorModal";
import { db } from "@/lib/firebase";
import { Exercise, getCategoryFromMuscle } from "../lib/exercise";

/** Sets as free text on this page only (same idea as reps); parsed when saving. */
type CreateWorkoutExercise = Omit<ModalExercise, "sets"> & { sets?: string };

function toCreateWorkoutExercise(ex: Exercise): CreateWorkoutExercise {
  return {
    ...ex,
    difficulty: ex.difficulty,
    sets: "3",
    repsRange: "8-12",
  };
}

function targetSetsFromForm(s: string | undefined): number {
  const n = parseInt(String(s ?? "").trim(), 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export default function CreateWorkoutPage() {
  const router = useRouter();
  const [workoutName, setWorkoutName] = useState("");
  const [workoutExercises, setWorkoutExercises] = useState<CreateWorkoutExercise[]>([]);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
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
      } catch (e) {
        console.error("Error fetching exercises:", e);
        setLibrary([]);
      } finally {
        setLoadingLibrary(false);
      }
    };
    fetchExercises();
  }, []);

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return library;
    return library.filter(
      (ex) =>
        ex.name.toLowerCase().includes(q) ||
        ex.muscleGroup.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q)
    );
  }, [library, searchQuery]);

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
    const next = [...workoutExercises];
    const [item] = next.splice(draggedIndex, 1);
    next.splice(index, 0, item);
    setWorkoutExercises(next);
    setDraggedIndex(index);
  };
  const onDragEndRow = () => setDraggedIndex(null);

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
      router.push("/workouts");
    } catch (err) {
      console.error("Error saving workout:", err);
      alert("Failed to save workout. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen w-[calc(100%-220px)]">
        <div className="p-6 lg:p-2 w-full max-w-none">
          <Breadcrumbs
            items={[
              { label: "Workouts", href: "/workouts" },
              { label: "Create workout" },
            ]}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Create a workout</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/workouts"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-beshaped-green text-white text-sm font-semibold hover:bg-beshaped-dark-green disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Save workout"}
              </button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 xl:items-stretch min-h-[min(70vh,800px)]">
            {/* Left: exercise library */}
            <section className="flex-1 min-w-0 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden xl:max-w-[52%]">
              <div className="flex flex-col gap-0.5 px-4 py-3 border-b border-border bg-muted/40">
                <h2 className="text-sm font-semibold leading-tight text-card-foreground">Exercise library</h2>
                <p className="text-xs leading-tight text-muted-foreground">
                  All exercises — search and add to your workout.
                </p>
              </div>
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search exercises…"
                    className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto min-h-[280px]">
                {loadingLibrary ? (
                  <p className="p-6 text-sm text-muted-foreground">Loading exercises…</p>
                ) : filteredLibrary.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">No exercises match your search.</p>
                ) : (
                  <table className="w-full min-w-[480px] table-fixed border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-left">
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[38%]">Exercise</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[22%]">Muscle</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[28%]">Equipment</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[12%] text-right">
                          Add
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLibrary.map((ex) => (
                        <tr
                          key={ex.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("exercise", JSON.stringify(ex));
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          className="border-b border-border last:border-b-0 hover:bg-muted/30"
                        >
                          <td className="px-3 py-2 align-middle font-medium text-card-foreground truncate">
                            {ex.name}
                          </td>
                          <td className="px-3 py-2 align-middle text-muted-foreground truncate">{ex.muscleGroup}</td>
                          <td className="px-3 py-2 align-middle text-muted-foreground truncate">{ex.equipment}</td>
                          <td className="px-3 py-2 align-middle text-right">
                            <button
                              type="button"
                              onClick={() => addFromLibrary(ex)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* Right: your workout */}
            <section className="flex-1 min-w-0 flex flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex flex-col gap-0.5 px-4 py-3 border-b border-border bg-muted/40">
                <label htmlFor="workout-name" className="sr-only">
                  Workout name
                </label>
                <input
                  ref={workoutNameInputRef}
                  id="workout-name"
                  type="text"
                  value={workoutName}
                  onChange={(e) => {
                    setWorkoutName(e.target.value);
                    setNameError(false);
                  }}
                  required
                  aria-invalid={nameError}
                  aria-describedby={
                    nameError ? "workout-name-error workout-name-hint" : "workout-name-hint"
                  }
                  className={`block w-full max-w-[50%] min-h-0 border-0 bg-transparent p-0 text-sm font-semibold leading-tight text-card-foreground placeholder:text-muted-foreground placeholder:font-normal shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-muted/40 ${
                    nameError
                      ? "focus-visible:ring-destructive"
                      : "focus-visible:ring-ring"
                  }`}
                  placeholder="Enter the name of the workout here"
                  autoComplete="off"
                />
                {nameError ? (
                  <p id="workout-name-error" className="text-xs leading-tight text-destructive" role="alert">
                    Enter a workout name to save.
                  </p>
                ) : null}
                <p id="workout-name-hint" className="text-xs leading-tight text-muted-foreground">
                  {workoutExercises.length} exercise{workoutExercises.length === 1 ? "" : "s"}
                </p>
              </div>
              <div
              /* This is the container of the cards */
                className="flex-1 overflow-y-auto min-h-[280px] "
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("bg-primary/5");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("bg-primary/5");
                }}
                onDrop={onDropBuilder}
              >
                {workoutExercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[220px] text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
                    <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No exercises yet</p>
                    <p className="text-xs text-center px-4">
                      Use <strong>Add</strong> in the table on the left, or drag a row here.
                    </p>
                  </div>
                ) : (
                  workoutExercises.map((exercise, index) => (
                    /* CARDS START HERE */
                    <div
                      key={`${exercise.id}-${index}`}
                      draggable
                      onDragStart={() => onDragStartRow(index)}
                      onDragOver={(e) => onDragOverRow(e, index)}
                      onDragEnd={onDragEndRow}
                      /* This is the cards itself */
                      /* py is on 2 but i may increase so i can add the set and reps shortcuts */
                      className={`border bg-card px-3 py-2 transition-all cursor-grab active:cursor-grabbing ${
                        draggedIndex === index
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-nowrap items-center gap-2">
                            <p className="min-w-0 flex-1 text-sm font-medium text-card-foreground truncate">
                              {exercise.name}
                            </p>
                            <span className="min-w-0 max-w-[min(11rem,36vw)] shrink truncate text-xs text-muted-foreground">
                              {exercise.muscleGroup} · {exercise.equipment}
                            </span>
                            <div className="ml-3 flex shrink-0 items-center gap-2 sm:ml-4">
                              <label className="text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                                Sets
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={exercise.sets ?? ""}
                                  onChange={(e) => updateExercise(index, "sets", e.target.value)}
                                  className="ml-1 w-14 rounded border border-border px-2 py-1 text-sm"
                                />
                              </label>
                              <label className="text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                                Reps
                                <input
                                  type="text"
                                  value={exercise.repsRange ?? ""}
                                  onChange={(e) => updateExercise(index, "repsRange", e.target.value)}
                                  className="ml-1 w-24 rounded border border-border px-2 py-1 text-sm"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAt(index)}
                          className="shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          aria-label="Remove exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
