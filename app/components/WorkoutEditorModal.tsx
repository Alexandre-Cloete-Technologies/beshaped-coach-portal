"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  Dumbbell,
  GripVertical,
} from "lucide-react";
import { db } from "@/lib/firebase";

export interface ModalExercise {
  id: string;
  name: string;
  muscleGroup: string;
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
  onClose: (result: { workoutName: string; exercises: ModalExercise[] }) => void;
  onTemplateSaved?: () => void;
}

export default function WorkoutEditorModal({
  isOpen,
  workoutName,
  exercises,
  groupedExercises,
  muscleGroupOrder,
  loadingExercises,
  onClose,
  onTemplateSaved,
}: WorkoutEditorModalProps) {
  const [localWorkoutName, setLocalWorkoutName] = useState(
    workoutName || "New Workout"
  );
  const [localExercises, setLocalExercises] = useState<ModalExercise[]>(
    exercises || []
  );
  const [modalExpandedGroups, setModalExpandedGroups] = useState<Set<string>>(
    new Set()
  );
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [draggedExerciseIndex, setDraggedExerciseIndex] =
    useState<number | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLocalWorkoutName(workoutName || "New Workout");
    setLocalExercises(exercises || []);
    setModalExpandedGroups(new Set());
    setModalSearchQuery("");
    setDraggedExerciseIndex(null);
  }, [isOpen, workoutName, exercises]);

  useEffect(() => {
    if (!modalSearchQuery.trim()) return;
    const groupsWithMatches = new Set<string>();
    Object.entries(groupedExercises).forEach(([group, exs]) => {
      const hasMatch = exs.some(
        (ex) =>
          ex.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
          ex.equipment.toLowerCase().includes(modalSearchQuery.toLowerCase())
      );
      if (hasMatch) groupsWithMatches.add(group);
    });
    setModalExpandedGroups(groupsWithMatches);
  }, [modalSearchQuery, groupedExercises]);

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

      await addDoc(collection(db, "workouts"), {
        name: localWorkoutName?.trim() || "New Workout",
        description: "",
        createdBy: "admin",
        createdByRole: "admin",
        exercises: mappedExercises,
        tags: [],
        estimatedDuration: mappedExercises.length * 5,
        createdAt: now,
        updatedAt: now,
      });

      onTemplateSaved?.();
      alert("Workout template saved.");
    } catch (error) {
      console.error("Error saving workout template:", error);
      alert("Failed to save workout template. Please try again.");
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={localWorkoutName}
              onChange={(e) => setLocalWorkoutName(e.target.value)}
              className="w-full bg-transparent border-none text-xl font-bold text-white placeholder-blue-200 focus:ring-0 px-0 leading-tight focus:outline-none"
              placeholder="Enter workout name"
            />
            <p className="text-sm text-blue-100">
              {localExercises.length} exercises
            </p>
          </div>
          <button
            onClick={handleDone}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Two Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Current Workout Exercises */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <h3 className="text-sm font-semibold text-card-foreground">
                Workout Exercises
              </h3>
              <p className="text-xs text-muted-foreground">Drag to reorder</p>
            </div>
            <div
              className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 min-h-[280px]"
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
                <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg">
                  <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No exercises yet</p>
                  <p className="text-xs">
                    Drag exercises here or use + button →
                  </p>
                </div>
              ) : (
                <>
                {localExercises.map((exercise, index) => (
                  <div
                    key={`${exercise.id}-${index}`}
                    draggable
                    onDragStart={() => handleModalExerciseDragStart(index)}
                    onDragOver={(e) => handleModalExerciseDragOver(e, index)}
                    onDragEnd={handleModalExerciseDragEnd}
                    className={`group rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                      draggedExerciseIndex === index
                        ? "border-primary bg-primary/10 shadow-lg scale-[1.02]"
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    {/* Exercise Header Row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-muted text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </div>
                      <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">
                          {exercise.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {exercise.muscleGroup} • {exercise.equipment}
                        </p>
                      </div>
                      <button
                        onClick={() => removeExerciseFromWorkout(index)}
                        className="opacity-0 group-hover:opacity-100 p-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-muted-foreground hover:text-red-500 transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Sets & Reps Row */}
                    <div className="flex flex-col gap-2 px-3 pb-3 pt-0">
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12 shrink-0">Sets:</span>
                        {[2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateExerciseInWorkout(index, "sets", num);
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                              (exercise.sets || 3) === num
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-border hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={exercise.sets || 3}
                          onChange={(e) =>
                            updateExerciseInWorkout(
                              index,
                              "sets",
                              parseInt(e.target.value) || 1
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 px-2 py-1.5 text-center text-sm font-bold border-2 border-primary/40 rounded-md bg-primary/10 text-card-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 flex-nowrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-12 shrink-0">Reps:</span>
                        {["5", "8-12", "15-20", "8-12/15-20", "8-10"].map((reps) => (
                          <button
                            key={reps}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateExerciseInWorkout(index, "repsRange", reps);
                            }}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                              (exercise.repsRange || "8-12") === reps
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-border hover:bg-muted hover:border-primary/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {reps}
                          </button>
                        ))}
                        <input
                          type="text"
                          value={exercise.repsRange ?? ""}
                          onChange={(e) =>
                            updateExerciseInWorkout(
                              index,
                              "repsRange",
                              e.target.value
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder="8-12"
                          className="w-24 px-2 py-1.5 text-center text-sm font-bold border-2 border-primary/40 rounded-md bg-primary/10 text-card-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="min-h-[120px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg text-muted-foreground">
                  <Plus className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-medium">Drop exercises here</p>
                </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Exercise Library */}
          <div className="w-1/2 flex flex-col bg-muted/20">
            <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-card-foreground">
                  Exercise Library
                </h3>
                <span className="text-xs text-muted-foreground">Drag or +</span>
              </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-card placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Search exercises..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {loadingExercises ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Loading exercises...
              </div>
            ) : (
              muscleGroupOrder.map((group) => {
                let groupExercises = groupedExercises[group] || [];
                if (modalSearchQuery.trim()) {
                  groupExercises = groupExercises.filter(
                    (ex) =>
                      ex.name
                        .toLowerCase()
                        .includes(modalSearchQuery.toLowerCase()) ||
                      ex.equipment
                        .toLowerCase()
                        .includes(modalSearchQuery.toLowerCase())
                  );
                }
                if (groupExercises.length === 0) return null;

                const isExpanded = modalExpandedGroups.has(group);

                return (
                  <div
                    key={group}
                    className="border border-border rounded-lg overflow-hidden bg-card"
                  >
                    <button
                      onClick={() => {
                        setModalExpandedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(group)) next.delete(group);
                          else next.add(group);
                          return next;
                        });
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold text-card-foreground uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                        {group}
                      </div>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {groupExercises.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-border/50">
                        {groupExercises.map((exercise) => (
                          <div
                            key={exercise.id}
                            className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "exercise",
                                JSON.stringify(exercise)
                              );
                            }}
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground truncate">
                                {exercise.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {exercise.equipment} • {exercise.difficulty}
                              </p>
                            </div>
                            <button
                              onClick={() => addExerciseToWorkout(exercise)}
                              className="px-5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors min-w-[56px] flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {localExercises.length} exercise
          {localExercises.length !== 1 ? "s" : ""} in workout
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate}
            className="px-4 py-2 border border-border bg-card text-card-foreground rounded-lg font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingTemplate ? "Saving..." : "Save as Template"}
          </button>
          <button
            onClick={handleDone}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}

