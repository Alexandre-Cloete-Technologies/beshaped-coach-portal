"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Breadcrumbs, { BreadcrumbItem } from "../../components/Breadcrumbs";
import { muscleGroupOrder } from "../lib/exercise";
import type { WorkoutEditorState } from "../lib/useWorkoutEditor";

export type WorkoutEditorViewProps = WorkoutEditorState & {
  heading?: string;
  submitLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
};

const DEFAULT_BREADCRUMBS: BreadcrumbItem[] = [
  { label: "Workouts", href: "/workouts" },
  { label: "Create workout" },
];

export default function WorkoutEditorView({
  heading = "Create a workout",
  submitLabel = "Save workout",
  breadcrumbs = DEFAULT_BREADCRUMBS,

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
}: WorkoutEditorViewProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="min-h-0 w-full flex-1 p-2">
        <div className="p-6 lg:p-2 w-full max-w-none">
          <Breadcrumbs items={breadcrumbs} />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3 ">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{heading}</h1>
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
                {saving ? "Saving…" : submitLabel}
              </button>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 xl:items-stretch min-h-[min(70vh,800px)]">
            {/* Left: exercise library */}
            <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:min-h-0 xl:flex-[2]">
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
                <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Filter by muscle group">
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
                        <span className="ml-1 tabular-nums opacity-70">({library.length})</span>
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
                        <span className="ml-1 tabular-nums opacity-70">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 overflow-auto min-h-[280px]">
                {loadingLibrary ? (
                  <p className="p-6 text-sm text-muted-foreground">Loading exercises…</p>
                ) : filteredLibrary.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground text-center">
                    {selectedCategories.size > 0
                      ? `No exercises match ${Array.from(selectedCategories).join(", ")}.`
                      : "No exercises match your search."}
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
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[32%]">Exercise</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[20%]">Muscle</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground w-[26%]">Equipment</th>
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
                            e.dataTransfer.setData("exercise", JSON.stringify(ex));
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
            <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm xl:min-h-0 xl:flex-[3]">
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
                      draggable={inputFocusRowIndex !== index}
                      onDragStart={() => onDragStartRow(index)}
                      onDragOver={(e) => onDragOverRow(e, index)}
                      onDragEnd={onDragEndRow}
                      className={`border bg-card px-3 py-3 transition-all ${
                        inputFocusRowIndex === index
                          ? "cursor-default"
                          : "cursor-grab active:cursor-grabbing"
                      } ${
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
                            <div className="flex shrink-0 items-center">
                              {[2, 3, 4, 5].map((num) => {
                                const setsStr = (exercise.sets ?? "").trim();
                                const isActive = setsStr === String(num);
                                return (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateExercise(index, "sets", String(num));
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
                                  value={exercise.sets ?? ""}
                                  onChange={(e) => updateExercise(index, "sets", e.target.value)}
                                  onFocus={() => setInputFocusRowIndex(index)}
                                  onBlur={() => onExerciseInputsBlur(index)}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="ml-1 box-border h-8 w-12 rounded border border-black px-1.5 text-center text-sm tabular-nums leading-8 text-foreground dark:border-neutral-300"
                                />
                              </label>
                              <div className="ml-8 flex shrink-0 items-center">
                                {["5", "8-10", "8-12", "15-20"].map((repShortcut) => {
                                  const repsStr = (exercise.repsRange ?? "").trim();
                                  const isActive = repsStr === repShortcut;
                                  return (
                                    <button
                                      key={repShortcut}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateExercise(index, "repsRange", repShortcut);
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
                                })}
                              </div>
                              <label className="text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">
                                Reps
                                <input
                                  type="text"
                                  data-inputs-row={index}
                                  value={exercise.repsRange ?? ""}
                                  onChange={(e) => updateExercise(index, "repsRange", e.target.value)}
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
