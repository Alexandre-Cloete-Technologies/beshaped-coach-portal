"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, Timestamp, updateDoc } from "firebase/firestore";
import {
  Search,
  X,
  Plus,
  Dumbbell,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import ConfirmModal from "./ConfirmModal";

export interface ModalExercise {
  id: string;
  name: string;
  muscleGroup: string;
  musclesInvolved?: string[];
  equipment: string;
  difficulty: string;
  sets?: number;
  repsRange?: string;
}

interface WorkoutEditorModalProps {
  isOpen: boolean;
  workoutName: string;
  exercises: ModalExercise[];
  groupedExercises: Record<string, ModalExercise[]>;
  muscleGroupOrder: string[];
  loadingExercises: boolean;
  /** When set, "Save as Template" updates this document instead of creating a new one. */
  existingWorkoutId?: string | null;
  onClose: (result: { workoutName: string; exercises: ModalExercise[] }) => void;
  onTemplateSaved?: () => void;
  onDelete?: () => void;
}

export default function WorkoutEditorModal({
  isOpen,
  workoutName,
  exercises,
  groupedExercises,
  muscleGroupOrder,
  loadingExercises,
  existingWorkoutId = null,
  onClose,
  onTemplateSaved,
  onDelete,
}: WorkoutEditorModalProps) {
  const [localWorkoutName, setLocalWorkoutName] = useState(
    workoutName || ""
  );
  const [localExercises, setLocalExercises] = useState<ModalExercise[]>(
    exercises || []
  );
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [inputFocusRowIndex, setInputFocusRowIndex] = useState<number | null>(
    null
  );
  const [draggedExerciseIndex, setDraggedExerciseIndex] =
    useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLocalWorkoutName(workoutName || "");
    setLocalExercises(exercises || []);
    setModalSearchQuery("");
    setSelectedCategories(new Set());
    setInputFocusRowIndex(null);
    setDraggedExerciseIndex(null);
  }, [isOpen, workoutName, exercises]);

  const filteredLibrary = useMemo(() => {
    const q = modalSearchQuery.trim().toLowerCase();
    const groups =
      selectedCategories.size === 0
        ? muscleGroupOrder
        : muscleGroupOrder.filter((g) => selectedCategories.has(g));
    const out: ModalExercise[] = [];
    for (const group of groups) {
      let exs = groupedExercises[group] || [];
      if (q) {
        exs = exs.filter(
          (ex) =>
            ex.name.toLowerCase().includes(q) ||
            ex.muscleGroup.toLowerCase().includes(q) ||
            ex.equipment.toLowerCase().includes(q)
        );
      }
      out.push(...exs);
    }
    return out;
  }, [
    groupedExercises,
    muscleGroupOrder,
    modalSearchQuery,
    selectedCategories,
  ]);

  const totalLibraryCount = useMemo(
    () =>
      Object.values(groupedExercises).reduce((sum, arr) => sum + arr.length, 0),
    [groupedExercises]
  );

  const libraryCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of muscleGroupOrder) {
      counts[g] = groupedExercises[g]?.length ?? 0;
    }
    return counts;
  }, [groupedExercises, muscleGroupOrder]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  if (!isOpen) return null;

  const addExerciseToWorkout = (exercise: ModalExercise) => {
    setLocalExercises((prev) => [
      ...prev,
      {
        ...exercise,
        sets: exercise.sets || 3,
        repsRange: exercise.repsRange || "8-12",
      },
    ]);
  };

  const updateExerciseInWorkout = (
    index: number,
    field: keyof ModalExercise,
    value: any
  ) => {
    setLocalExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
    );
  };

  const removeExerciseFromWorkout = (index: number) => {
    setLocalExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModalExerciseDragStart = (index: number) => {
    setDraggedExerciseIndex(index);
  };

  const handleModalExerciseDragOver = (
    e: React.DragEvent,
    index: number
  ) => {
    e.preventDefault();
    if (draggedExerciseIndex === null || draggedExerciseIndex === index) return;
    const newExercises = [...localExercises];
    const [draggedItem] = newExercises.splice(draggedExerciseIndex, 1);
    newExercises.splice(index, 0, draggedItem);
    setLocalExercises(newExercises);
    setDraggedExerciseIndex(index);
  };

  const handleModalExerciseDragEnd = () => {
    setDraggedExerciseIndex(null);
  };

  const handleDropOnWorkoutList = (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.currentTarget.classList.remove("bg-primary/5");
    const exerciseData = e.dataTransfer.getData("exercise");
    if (exerciseData) {
      const exercise: ModalExercise = JSON.parse(exerciseData);
      addExerciseToWorkout(exercise);
    }
  };

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

  const handleDone = () => {
    onClose({
      workoutName: localWorkoutName || "New Workout",
      exercises: localExercises,
    });
  };

  const handleSaveAsTemplate = async () => {
    if (savingTemplate) return;

    try {
      setSavingTemplate(true);

      const now = Timestamp.now();
      const mappedExercises = localExercises.map((exercise, idx) => {
        const targetSets = exercise.sets || 0;
        const targetReps = exercise.repsRange || "";

        const payload: {
          exerciseId: string;
          exerciseName: string;
          order: number;
          targetSets: number;
          targetReps: string;
          restPeriod?: string;
          notes?: string | null;
        } = {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          order: idx + 1,
          targetSets,
          targetReps,
        };

        return payload;
      });

      const name = localWorkoutName?.trim() || "New Workout";
      const estimatedDuration = mappedExercises.length * 5;

      if (existingWorkoutId) {
        await updateDoc(doc(db, "workouts", existingWorkoutId), {
          name,
          exercises: mappedExercises,
          tags: [],
          estimatedDuration,
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
          estimatedDuration,
          createdAt: now,
          updatedAt: now,
        });
      }

      onTemplateSaved?.();
      alert(existingWorkoutId ? "Workout updated." : "Workout template saved.");
    } catch (error) {
      console.error("Error saving workout template:", error);
      alert("Failed to save workout template. Please try again.");
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] min-h-0 flex flex-col overflow-hidden">
        {/* Modal Header — neutral, matches inner section strips */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex-1 mr-4 min-w-0">
            <input
              type="text"
              value={localWorkoutName}
              onChange={(e) => setLocalWorkoutName(e.target.value)}
              className="w-full bg-transparent border-none text-xl font-bold text-card-foreground placeholder:text-muted-foreground px-0 py-0.5 leading-tight rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted/40"
              placeholder="New Workout"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {localExercises.length} exercise{localExercises.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Two Columns (match /workouts create page layout) */}
        <div className="flex flex-1 min-h-0 gap-4 md:gap-6 overflow-hidden px-4 pb-2">
          {/* Left: exercise library */}
          <section className="flex min-w-0 flex-[2] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-0.5 px-4 py-3 border-b border-border bg-muted/40">
              <h2 className="text-sm font-semibold leading-tight text-card-foreground">
                Exercise library
              </h2>
              <p className="text-xs leading-tight text-muted-foreground">
                All exercises — search and add to your workout.
              </p>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Search exercises…"
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                />
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
                          : "border-border bg-muted/50 text-foreground hover:bg-beshaped-green hover:border-beshaped-dark-green hover:text-white"
                      }`}
                    >
                      All
                      <span className="ml-1 tabular-nums opacity-70">
                        ({totalLibraryCount})
                      </span>
                    </button>
                  );
                })()}
                {muscleGroupOrder.map((cat) => {
                  const isActive = selectedCategories.has(cat);
                  const count = libraryCategoryCounts[cat] ?? 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      aria-pressed={isActive}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-primary bg-beshaped-green text-primary-foreground"
                          : "border-border bg-muted/50 text-foreground hover:bg-beshaped-green hover:border-beshaped-dark-green hover:text-white"
                      }`}
                    >
                      {cat}
                      <span className="ml-1 tabular-nums opacity-70">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {loadingExercises ? (
                <p className="p-6 text-sm text-muted-foreground">Loading exercises…</p>
              ) : filteredLibrary.length === 0 && totalLibraryCount > 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  {selectedCategories.size > 0
                    ? `No exercises match ${Array.from(selectedCategories).join(
                        ", "
                      )}.`
                    : "No exercises match your search."}
                </p>
              ) : filteredLibrary.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground text-center">
                  No exercises in the library yet.
                </p>
              ) : (
                <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left">
                      <th
                        scope="col"
                        className="w-[10%] px-2 py-2 text-center text-sm font-semibold text-muted-foreground"
                      >
                        #
                      </th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground w-[32%]">
                        Exercise
                      </th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground w-[20%]">
                        Muscle
                      </th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground w-[26%]">
                        Equipment
                      </th>
                      <th className="px-3 py-2 font-semibold text-muted-foreground w-[12%] text-right">
                        Add
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLibrary.map((ex, rowIndex) => (
                      <tr
                        key={ex.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            "exercise",
                            JSON.stringify(ex)
                          );
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-2 py-2 align-middle text-center text-sm text-muted-foreground tabular-nums">
                          {rowIndex + 1}
                        </td>
                        <td className="px-3 py-2 align-middle font-medium text-card-foreground truncate">
                          {ex.name}
                        </td>
                        <td className="px-3 py-2 align-middle text-muted-foreground truncate">
                          {ex.muscleGroup}
                        </td>
                        <td className="px-3 py-2 align-middle text-muted-foreground truncate">
                          {ex.equipment}
                        </td>
                        <td className="px-3 py-2 align-middle text-right">
                          <button
                            type="button"
                            onClick={() => addExerciseToWorkout(ex)}
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
          <section className="flex min-w-0 flex-[3] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-0.5 px-4 py-3 border-b border-border bg-muted/40">
              <h2 className="text-sm font-semibold leading-tight text-card-foreground">
                Your workout
              </h2>
              <p className="text-xs leading-tight text-muted-foreground">
                {localExercises.length} exercise
                {localExercises.length === 1 ? "" : "s"} — drag to reorder, or
                add from the library table.
              </p>
            </div>
            <div
              className="flex-1 min-h-0 overflow-y-auto"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("bg-primary/5");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("bg-primary/5");
              }}
              onDrop={handleDropOnWorkoutList}
            >
              {localExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[220px] text-muted-foreground py-8 border-2 border-dashed border-border rounded-lg">
                  <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No exercises yet</p>
                  <p className="text-xs text-center px-4">
                    Use <strong>Add</strong> in the table on the left, or drag a
                    row here.
                  </p>
                </div>
              ) : (
                localExercises.map((exercise, index) => (
                  <div
                    key={`${exercise.id}-${index}`}
                    draggable={inputFocusRowIndex !== index}
                    onDragStart={() => handleModalExerciseDragStart(index)}
                    onDragOver={(e) => handleModalExerciseDragOver(e, index)}
                    onDragEnd={handleModalExerciseDragEnd}
                    className={`border bg-card px-3 py-3 transition-all ${
                      inputFocusRowIndex === index
                        ? "cursor-default"
                        : "cursor-grab active:cursor-grabbing"
                    } ${
                      draggedExerciseIndex === index
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
                          <div className="flex shrink-0 items-center">
                            {[2, 3, 4, 5].map((num) => {
                              const isActive = (exercise.sets ?? 3) === num;
                              return (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateExerciseInWorkout(index, "sets", num);
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className={` border px-2 py-1 text-xs font-medium transition-colors ${
                                    isActive
                                      ? "border-primary bg-beshaped-green text-primary-foreground"
                                      : "border-border bg-muted/50 text-foreground hover:bg-beshaped-green hover:border-beshaped-dark-green hover:text-white"
                                  }`}
                                >
                                  {num}
                                </button>
                              );
                            })}
                          </div>
                          <div className="ml-3 flex shrink-0 items-center gap-2 sm:ml-4">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                              Sets
                              <input
                                type="text"
                                inputMode="numeric"
                                data-inputs-row={index}
                                value={
                                  exercise.sets !== undefined
                                    ? String(exercise.sets)
                                    : ""
                                }
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  if (v === "") {
                                    updateExerciseInWorkout(
                                      index,
                                      "sets",
                                      3
                                    );
                                    return;
                                  }
                                  const n = parseInt(v, 10);
                                  if (Number.isFinite(n)) {
                                    updateExerciseInWorkout(
                                      index,
                                      "sets",
                                      Math.max(1, n)
                                    );
                                  }
                                }}
                                onFocus={() => setInputFocusRowIndex(index)}
                                onBlur={() => onExerciseInputsBlur(index)}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="ml-1 box-border h-8 w-12 rounded border border-black px-1.5 text-center text-sm tabular-nums leading-8 text-foreground dark:border-neutral-300"
                              />
                            </label>
                            <div className="ml-8 flex shrink-0 items-center">
                              {["5", "8-10", "8-12", "15-20"].map(
                                (repShortcut) => {
                                  const repsStr = (exercise.repsRange ?? "")
                                    .trim();
                                  const isActive = repsStr === repShortcut;
                                  return (
                                    <button
                                      key={repShortcut}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateExerciseInWorkout(
                                          index,
                                          "repsRange",
                                          repShortcut
                                        );
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className={` border px-2 py-1 text-xs font-medium transition-colors ${
                                        isActive
                                          ? "border-primary bg-beshaped-green text-primary-foreground"
                                          : "border-border bg-muted/50 text-foreground hover:bg-beshaped-green hover:border-beshaped-dark-green hover:text-white"
                                      }`}
                                    >
                                      {repShortcut}
                                    </button>
                                  );
                                }
                              )}
                            </div>
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                              Reps
                              <input
                                type="text"
                                data-inputs-row={index}
                                value={exercise.repsRange ?? ""}
                                onChange={(e) =>
                                  updateExerciseInWorkout(
                                    index,
                                    "repsRange",
                                    e.target.value
                                  )
                                }
                                onFocus={() => setInputFocusRowIndex(index)}
                                onBlur={() => onExerciseInputsBlur(index)}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="ml-1 box-border h-8 w-[4.5rem] rounded border border-black px-1.5 text-center text-sm leading-8 text-foreground dark:border-neutral-300"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExerciseFromWorkout(index)}
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

      {/* Modal Footer */}
      <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {localExercises.length} exercise
            {localExercises.length !== 1 ? "s" : ""} in workout
          </p>
          {onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Workout
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate}
            className=" px-4 py-2 border border-border bg-card text-card-foreground rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingTemplate ? "Saving..." : "Save as Template"}
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-2 bg-beshaped-dark-green text-white rounded-lg font-semibold hover:bg-beshaped-green transition-colors"
          >
            Done
          </button>
        </div>
      </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await onDelete?.();
        }}
        title="Delete Workout"
        message={
          <>
            <p className="mb-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-card-foreground">
                {localWorkoutName?.trim() || "this workout"}
              </span>
              ?
            </p>
            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
          </>
        }
        confirmLabel="Delete Workout"
      />
    </div>
  );
}

