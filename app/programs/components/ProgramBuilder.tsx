"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Edit,
  GripVertical,
  Hotel,
  Info,
  Layers,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "../../components/Navbar";
import WorkoutEditorModal, {
  ModalExercise,
} from "../../components/WorkoutEditorModal";
import PhaseDescriptionModal from "../../components/PhaseDescriptionModal";
import ConfirmModal from "../../components/ConfirmModal";
import {
  mockTemplates,
  muscleGroupOrder,
  useProgramEditor,
  type ProgramFormData,
  type WorkoutCard,
  type WorkoutTemplate,
} from "../lib/useProgramEditor";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ProgramBuilderProps {
  initialProgram?: Partial<ProgramFormData>;
  isEditing: boolean;
  headerVariant: "aside" | "banner";
  draftKey?: string;
  submitLabel?: string;
  saving?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
  onSave: (data: ProgramFormData) => void | Promise<void>;
  onCancel?: () => void;
  onStartEditing?: () => void;
  backHref?: string;
}

export default function ProgramBuilder({
  initialProgram,
  isEditing,
  headerVariant,
  draftKey,
  submitLabel = "Save",
  saving = false,
  showClearButton = false,
  onClear,
  onSave,
  onCancel,
  onStartEditing,
  backHref = "/programs",
}: ProgramBuilderProps) {
  const editor = useProgramEditor({ initialProgram, isEditing, draftKey });

  const {
    program,
    setProgramName,
    setProgramDescription,
    setAccessType,
    setPrice,
    addPhase,
    deletePhase,
    updatePhaseName,
    updatePhaseDescription,
    updatePhaseDuration,
    setRestDay,
    clearDay,
    dropWorkoutOnDay,
    dropTemplateOnDay,
    applyWorkoutEdit,
    resetProgram,
    loadingExercises,
    groupedExercises,
    savedTemplates,
    workoutLibrary,
    loadingTemplates,
    templateFetchError,
    fetchWorkoutTemplates,
    sidebarTab,
    setSidebarTab,
    searchQuery,
    setSearchQuery,
    expandedGroups,
    toggleGroup,
    expandedPhases,
    togglePhase,
    expandedWorkouts,
    toggleWorkout,
    selectedSlot,
    setSelectedSlot,
    selectedTemplate,
    setSelectedTemplate,
    selectedLibraryWorkout,
    setSelectedLibraryWorkout,
    phaseDescriptionModalIdx,
    setPhaseDescriptionModalIdx,
    phaseDescriptionDraft,
    setPhaseDescriptionDraft,
    phaseMenuOpenId,
    setPhaseMenuOpenId,
    phasePendingDeleteIdx,
    setPhasePendingDeleteIdx,
  } = editor;

  const isBanner = headerVariant === "banner";
  const isAside = headerVariant === "aside";

  // Template preview rename draft (aside mode only)
  const phaseHeaderMenuRef = useRef<HTMLDivElement | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [savingTemplateName, setSavingTemplateName] = useState(false);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] =
    useState(false);

  useEffect(() => {
    if (phaseMenuOpenId == null) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = phaseHeaderMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setPhaseMenuOpenId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [phaseMenuOpenId, setPhaseMenuOpenId]);

  // Derived: filtered templates (aside variant)
  const allTemplates = useMemo(
    () => [...savedTemplates, ...mockTemplates],
    [savedTemplates]
  );

  const filteredTemplates = useMemo(
    () =>
      allTemplates.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [allTemplates, searchQuery]
  );

  const savedTemplateResults = filteredTemplates.filter(
    (t) => t.category === "saved"
  );
  const recentTemplates = filteredTemplates.filter(
    (t) => t.category === "recent"
  );
  const strengthTemplates = filteredTemplates.filter(
    (t) => t.category === "strength"
  );

  // Derived: filtered workout library cards (banner variant)
  const filteredWorkoutCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workoutLibrary;
    return workoutLibrary.filter(
      (card) =>
        card.workoutName.toLowerCase().includes(q) ||
        (card.description || "").toLowerCase().includes(q)
    );
  }, [workoutLibrary, searchQuery]);

  const totalWorkouts = useMemo(
    () =>
      program.phases.reduce(
        (acc, phase) =>
          acc +
          phase.workouts.filter(
            (w) => w.workoutName && !w.isRestDay
          ).length,
        0
      ),
    [program.phases]
  );

  const totalDuration = useMemo(
    () => program.phases.reduce((acc, p) => acc + p.durationWeeks, 0),
    [program.phases]
  );

  // === Handlers ===

  const handleTemplateDragStart = (
    e: React.DragEvent,
    template: WorkoutTemplate
  ) => {
    if (!isEditing) return;
    e.dataTransfer.setData("template", JSON.stringify(template));
  };

  const handleCardDragStart = (e: React.DragEvent, card: WorkoutCard) => {
    if (!isEditing) return;
    e.dataTransfer.setData("workout-card", JSON.stringify(card));
  };

  const handleDayDragOver = (e: React.DragEvent) => {
    if (!isEditing) return;
    e.preventDefault();
  };

  const handleDayDrop = (
    e: React.DragEvent,
    phaseIdx: number,
    dayIdx: number
  ) => {
    if (!isEditing) return;
    e.preventDefault();

    const templateRaw = e.dataTransfer.getData("template");
    const cardRaw = e.dataTransfer.getData("workout-card");

    if (templateRaw) {
      try {
        const template = JSON.parse(templateRaw) as WorkoutTemplate;
        dropTemplateOnDay(phaseIdx, dayIdx, template);
      } catch (err) {
        console.error("Failed to drop template:", err);
      }
      return;
    }

    if (cardRaw) {
      try {
        const card = JSON.parse(cardRaw) as WorkoutCard;
        dropWorkoutOnDay(phaseIdx, dayIdx, card);
      } catch (err) {
        console.error("Failed to drop workout card:", err);
      }
    }
  };

  const openWorkoutModal = (phaseIdx: number, dayIdx: number) => {
    setSelectedSlot({ phaseIdx, dayIdx });
  };

  const handleWorkoutModalClose = (result: {
    workoutName: string;
    exercises: ModalExercise[];
  }) => {
    if (selectedSlot) {
      applyWorkoutEdit(selectedSlot.phaseIdx, selectedSlot.dayIdx, result);
    }
    setSelectedSlot(null);
  };

  const handleLibraryWorkoutModalClose = async (result: {
    workoutName: string;
    exercises: ModalExercise[];
  }) => {
    if (!selectedLibraryWorkout) return;

    const newName =
      result.workoutName?.trim() || selectedLibraryWorkout.workoutName;
    const mappedExercises = (result.exercises || []).map((ex, idx) => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      order: idx,
      targetSets: ex.sets || 3,
      targetReps: ex.repsRange || "8-12",
    }));

    try {
      await updateDoc(doc(db, "workouts", selectedLibraryWorkout.id), {
        name: newName,
        exercises: mappedExercises,
        estimatedDuration: (result.exercises || []).length * 5,
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Error updating workout:", err);
      alert("Failed to save workout changes. Please try again.");
    }

    await fetchWorkoutTemplates();
    setSelectedLibraryWorkout(null);
  };

  const openTemplateModal = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setTemplateNameDraft(template.name);
  };

  const handleSave = async () => {
    const trimmedName = program.name.trim();
    if (!trimmedName) {
      alert("Please enter a program title before saving.");
      return;
    }
    if (
      program.accessType === "paid" &&
      (program.price == null || program.price < 0)
    ) {
      alert("Please enter a valid price for paid programs.");
      return;
    }
    await onSave({ ...program, name: trimmedName });
  };

  const handleClearClick = () => {
    if (onClear) {
      onClear();
    } else {
      resetProgram();
    }
  };

  // === Render helpers ===

  const renderSidebar = () => (
    <aside
      className={`${
        isBanner ? "w-[300px]" : "w-[280px]"
      } shrink-0 flex flex-col bg-card border-r border-border z-10`}
    >
      {/* Sidebar Header / Search */}
      <div className="p-4 border-b border-border space-y-4">
        {isBanner && (
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <Layers className="w-4 h-4" />
            Workout Library
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border-none rounded-lg bg-muted text-sm placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:bg-card transition-all"
            placeholder={
              isBanner ? "Search workouts..." : "Search library..."
            }
          />
        </div>

        {isAside && (
          <div className="flex p-1 bg-muted rounded-lg">
            <button
              onClick={() => setSidebarTab("templates")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                sidebarTab === "templates"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Workouts
            </button>
            <button
              onClick={() => setSidebarTab("exercises")}
              className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                sidebarTab === "exercises"
                  ? "bg-card text-card-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Exercises
            </button>
          </div>
        )}
      </div>

      {/* Draggable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isBanner
          ? renderBannerSidebarList()
          : sidebarTab === "templates"
            ? renderAsideTemplateList()
            : renderAsideExerciseList()}
      </div>

      {isAside && (
        <div className="p-4 border-t border-border">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Plus className="w-4 h-4" />
            Create New Template
          </button>
        </div>
      )}
    </aside>
  );

  const renderBannerSidebarList = () => (
    <>
      {filteredWorkoutCards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => setSelectedLibraryWorkout(card)}
          draggable={isEditing}
          onDragStart={(e) => handleCardDragStart(e, card)}
          className="w-full text-left group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-card-foreground truncate">
              {card.workoutName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {card.exercises.length} exercises •{" "}
              {card.estimatedDuration || 0} min
            </p>
          </div>
          <Play className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
        </button>
      ))}
      {loadingTemplates && (
        <div className="text-center py-3 text-muted-foreground text-sm">
          Loading workouts...
        </div>
      )}
      {!loadingTemplates && filteredWorkoutCards.length === 0 && (
        <div className="text-center py-3 text-muted-foreground text-sm">
          No workouts found
        </div>
      )}
    </>
  );

  const renderTemplateRow = (template: WorkoutTemplate) => (
    <div
      key={template.id}
      className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
      draggable={isEditing}
      onDragStart={(e) => handleTemplateDragStart(e, template)}
      onClick={() => openTemplateModal(template)}
    >
      <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-card-foreground truncate">
          {template.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {template.exercises} Exercises • {template.duration} min
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          openTemplateModal(template);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <Info className="w-4 h-4" />
      </button>
    </div>
  );

  const renderAsideTemplateList = () => (
    <>
      {loadingTemplates && (
        <div className="text-center py-3 text-muted-foreground text-sm">
          Loading saved templates...
        </div>
      )}

      {!loadingTemplates && templateFetchError && (
        <div className="text-center py-3 text-muted-foreground text-xs">
          {templateFetchError}
        </div>
      )}

      {!loadingTemplates && savedTemplateResults.length > 0 && (
        <>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
            Saved Workouts
          </div>
          {savedTemplateResults.map(renderTemplateRow)}
        </>
      )}

      {!loadingTemplates &&
        !searchQuery.trim() &&
        savedTemplates.length === 0 &&
        !templateFetchError && (
          <div className="text-center py-3 text-muted-foreground text-xs">
            No saved templates yet.
          </div>
        )}

      {recentTemplates.length > 0 && (
        <>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
            Recent
          </div>
          {recentTemplates.map(renderTemplateRow)}
        </>
      )}

      {strengthTemplates.length > 0 && (
        <>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-4">
            Strength
          </div>
          {strengthTemplates.map(renderTemplateRow)}
        </>
      )}

      {!loadingTemplates &&
        recentTemplates.length === 0 &&
        strengthTemplates.length === 0 &&
        savedTemplateResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No templates found matching &quot;{searchQuery}&quot;
          </div>
        )}
    </>
  );

  const renderAsideExerciseList = () => (
    <div className="space-y-1">
      {loadingExercises ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Loading exercises...
        </div>
      ) : (
        muscleGroupOrder.map((group) => {
          const groupExercises = groupedExercises[group];
          if (groupExercises.length === 0) return null;
          const expanded = expandedGroups.has(group);

          return (
            <div
              key={group}
              className="border border-border rounded-lg overflow-hidden bg-card"
            >
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold text-card-foreground uppercase tracking-wider"
              >
                <div className="flex items-center gap-2">
                  {expanded ? (
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

              {expanded && (
                <div className="divide-y divide-border/50">
                  {groupExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-card-foreground truncate">
                          {exercise.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {exercise.equipment} • {exercise.difficulty}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {!loadingExercises &&
        Object.values(groupedExercises).every((g) => g.length === 0) && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No exercises found
          </div>
        )}
    </div>
  );

  // === Day card renderer (shared, with variant styling) ===

  const renderDayCard = (
    phaseIdx: number,
    phaseId: string,
    weekIdx: number,
    dayInWeekIdx: number,
    globalDayIdx: number
  ) => {
    const workout = program.phases[phaseIdx].workouts[globalDayIdx];
    if (!workout) return null;

    const workoutKey = `${phaseId}_${weekIdx}_${dayInWeekIdx}`;
    const hasExercises = (workout.exercises || []).length > 0;
    const isWorkoutExpanded = expandedWorkouts.has(workoutKey);

    // Aside variant uses taller / slightly different card styling (from builder).
    // Banner variant uses detail page card styling.

    if (workout.isRestDay) {
      return (
        <div
          key={globalDayIdx}
          className="flex h-full flex-col gap-2"
          onDragOver={handleDayDragOver}
          onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
        >
          <div className="group relative flex h-full flex-col items-center justify-center text-muted-foreground">
            {isEditing && (
              <button
                onClick={() => clearDay(phaseIdx, globalDayIdx)}
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                title="Remove rest day"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Hotel className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Rest Day</span>
          </div>
        </div>
      );
    }

    if (!workout.workoutName) {
      if (!isEditing) {
        return (
          <div
            key={globalDayIdx}
            className="flex flex-col gap-2"
            onDragOver={handleDayDragOver}
            onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
          >
            <div className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground/50">
              <span className="text-xs">Empty</span>
            </div>
          </div>
        );
      }

      return (
        <div
          key={globalDayIdx}
          className="flex flex-col gap-2"
          onDragOver={handleDayDragOver}
          onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
        >
          <div
            className={`flex ${
              isBanner ? "h-28" : "h-full min-h-[120px]"
            } flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group bg-card relative`}
            onClick={() => openWorkoutModal(phaseIdx, globalDayIdx)}
          >
            <div className="size-8 rounded-full bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-card flex items-center justify-center mb-2 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              Add Workout
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRestDay(phaseIdx, globalDayIdx);
              }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-medium rounded bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400 transition-all flex items-center gap-1"
            >
              <Hotel className="w-3 h-3" />
              Rest Day
            </button>
          </div>
        </div>
      );
    }

    // Workout day
    return (
      <div
        key={globalDayIdx}
        className="flex h-full flex-col gap-2"
        onDragOver={handleDayDragOver}
        onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
      >
        <div
          className={`group relative flex flex-col cursor-pointer ${
            isBanner ? "overflow-hidden" : "h-full gap-2"
          }`}
          onClick={() => {
            if (isEditing) {
              openWorkoutModal(phaseIdx, globalDayIdx);
            } else if (hasExercises) {
              toggleWorkout(workoutKey);
            }
          }}
        >
          {isBanner ? (
            <>
              {isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearDay(phaseIdx, globalDayIdx);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-500 transition-all z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <div className="p-3 flex flex-col items-center justify-center gap-1.5 h-28 text-center">
                <p className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2">
                  {workout.workoutName}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-auto">
                  <Dumbbell className="w-3 h-3" />
                  {hasExercises
                    ? `${workout.exercises.length} exercises`
                    : "No exercises"}
                  {!isEditing && hasExercises && (
                    isWorkoutExpanded ? (
                      <ChevronDown className="w-3 h-3 ml-auto" />
                    ) : (
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    )
                  )}
                </div>
              </div>

              {!isEditing && isWorkoutExpanded && hasExercises && (
                <div className="border-t border-indigo-200 dark:border-indigo-800 bg-card/80 divide-y divide-border/50">
                  {workout.exercises
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((exercise, exIdx) => (
                      <div key={exIdx} className="px-3 py-2 text-xs">
                        <p className="font-medium text-card-foreground truncate">
                          {exercise.exerciseName}
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          {exercise.sets} x {exercise.repsRange}
                          {exercise.restPeriod && (
                            <span> · {exercise.restPeriod} rest</span>
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-end">
                {isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearDay(phaseIdx, globalDayIdx);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm font-semibold text-card-foreground leading-tight text-center">
                {workout.workoutName}
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-auto">
                {hasExercises && (
                  <span className="bg-beshaped-dark-green text-white px-1.5 py-0.5 rounded text-[10px] font-medium">
                    {workout.exercises.length} exercises
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // === Phase card renderers ===

  const renderAsidePhaseCard = (
    phase: ProgramFormData["phases"][number],
    phaseIdx: number
  ) => {
    const expanded = expandedPhases.has(phase.phaseId);
    const totalDays = phase.workouts.length;

    return (
      <div
        key={phase.phaseId}
        className="flex flex-col bg-card shadow-sm border border-grey"
      >
        {/* Phase Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-4">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <button
              onClick={() => togglePhase(phase.phaseId)}
              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  expanded ? "" : "-rotate-90"
                }`}
              />
            </button>
            <div className="flex flex-row items-center gap-3 min-w-0 flex-1">
              <input
                type="text"
                value={phase.name}
                onChange={(e) => updatePhaseName(phaseIdx, e.target.value)}
                className="text-base font-bold text-card-foreground bg-transparent border-none p-0 focus:ring-0 shrink-0 w-auto min-w-[6rem] max-w-[40%]"
                placeholder="Phase Name"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 border border-border">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <select
                value={phase.durationWeeks}
                onChange={(e) =>
                  updatePhaseDuration(phaseIdx, parseInt(e.target.value))
                }
                className="bg-transparent text-sm font-medium text-card-foreground border-none focus:ring-0 p-0 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} Weeks
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setPhaseDescriptionModalIdx(phaseIdx);
                setPhaseDescriptionDraft(phase.description || "");
              }}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={
                phase.description?.trim()
                  ? "Edit phase description"
                  : "Add phase description"
              }
              aria-label="Edit phase description"
            >
              <Edit className="w-5 h-5" />
            </button>
            <div
              className="relative"
              ref={
                phaseMenuOpenId === phase.phaseId
                  ? phaseHeaderMenuRef
                  : undefined
              }
            >
              <button
                type="button"
                aria-expanded={phaseMenuOpenId === phase.phaseId}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  setPhaseMenuOpenId((id) =>
                    id === phase.phaseId ? null : phase.phaseId
                  );
                }}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {phaseMenuOpenId === phase.phaseId && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-border bg-card py-1 shadow-lg"
                >
                  <button
                    type="button"
                    role="menuitem"
                    disabled={program.phases.length <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhaseMenuOpenId(null);
                      if (program.phases.length <= 1) {
                        alert("A program must have at least one phase.");
                        return;
                      }
                      setPhasePendingDeleteIdx(phaseIdx);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 shrink-0" />
                    Delete phase
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Grid (flat, builder style) */}
        {expanded && (
          <>
            <div className="p-3">
              <div className="grid grid-cols-7 gap-0 min-w-[800px] mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {day}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0 min-w-[800px] border-l border-t border-black/30">
                {Array.from({ length: totalDays }).map((_, idx) => {
                  const weekIdx = Math.floor(idx / 7);
                  const dayInWeekIdx = idx % 7;
                  const workout = phase.workouts[idx];
                  const isRest = workout?.isRestDay;
                  const hasWorkout =
                    !!workout?.workoutName && !workout?.isRestDay;
                  const cellTint = isRest
                    ? "bg-muted/50"
                    : hasWorkout
                      ? "bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "";
                  return (
                    <div
                      key={idx}
                      className={`border-r border-b border-black/30 p-2 min-h-[130px] ${cellTint}`}
                    >
                      {renderDayCard(
                        phaseIdx,
                        phase.phaseId,
                        weekIdx,
                        dayInWeekIdx,
                        idx
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-muted/50 px-6 py-3 border-t border-border flex items-center justify-between">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>
                  Total Workouts:{" "}
                  {
                    phase.workouts.filter(
                      (w) => w.workoutName && !w.isRestDay
                    ).length
                  }
                </span>
              </div>
              <button className="text-xs font-medium text-primary hover:underline">
                Copy week to next week
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderBannerPhaseCard = (
    phase: ProgramFormData["phases"][number],
    phaseIdx: number
  ) => {
    const expanded = expandedPhases.has(phase.phaseId);
    const phaseWorkoutCount = phase.workouts.filter(
      (w) => w.workoutName && !w.isRestDay
    ).length;

    const weeks: number[][] = [];
    for (let i = 0; i < phase.workouts.length; i += 7) {
      const weekGlobalIdxs: number[] = [];
      for (let j = i; j < Math.min(i + 7, phase.workouts.length); j += 1) {
        weekGlobalIdxs.push(j);
      }
      weeks.push(weekGlobalIdxs);
    }

    return (
      <div
        key={phase.phaseId}
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      >
        <button
          onClick={() => togglePhase(phase.phaseId)}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
            <div className="text-left flex-1">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePhaseName(phaseIdx, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="text-lg font-bold text-card-foreground bg-transparent border-none outline-none w-full focus:outline-none"
                  />
                  <textarea
                    value={phase.description}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePhaseDescription(phaseIdx, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Phase description..."
                    rows={2}
                    className="text-sm text-muted-foreground mt-1 bg-transparent border-none outline-none w-full focus:outline-none resize-none"
                  />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-card-foreground">
                    {phase.name}
                  </h2>
                  {phase.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {phase.description}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border">
              <Clock className="w-3 h-3 text-muted-foreground" />
              {isEditing ? (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="number"
                    min={1}
                    value={phase.durationWeeks}
                    onChange={(e) => {
                      e.stopPropagation();
                      updatePhaseDuration(phaseIdx, Number(e.target.value));
                    }}
                    className="w-16 h-7 px-2 rounded border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-sm font-medium text-card-foreground">
                    {phase.durationWeeks === 1 ? "Week" : "Weeks"}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-medium text-card-foreground">
                  {phase.durationWeeks}{" "}
                  {phase.durationWeeks === 1 ? "Week" : "Weeks"}
                </span>
              )}
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span>{phaseWorkoutCount} workouts</span>
            </div>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border">
            {weeks.map((weekIdxs, weekIdx) => (
              <div key={weekIdx} className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                  Week {weekIdx + 1}
                </h3>
                <div className="grid grid-cols-7 gap-3 items-start">
                  {dayNames.map((day) => (
                    <div key={day} className="text-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {day}
                      </span>
                    </div>
                  ))}

                  {weekIdxs.map((globalIdx, dayInWeekIdx) =>
                    renderDayCard(
                      phaseIdx,
                      phase.phaseId,
                      weekIdx,
                      dayInWeekIdx,
                      globalIdx
                    )
                  )}
                </div>
              </div>
            ))}

            <div className="bg-muted/50 px-6 py-3 border-t border-border flex items-center justify-between">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Total Workouts: {phaseWorkoutCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // === Header renderers ===

  const renderAsideHeader = () => (
    <aside className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-8 xl:self-start">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-lg text-white">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex flex-col gap-6">
            <div className="flex-1 min-w-0">
              <label className="text-blue-100 text-xs font-semibold uppercase tracking-wider">
                Program Title
              </label>
              <input
                type="text"
                value={program.name}
                onChange={(e) => setProgramName(e.target.value)}
                className="w-full bg-transparent border-none text-3xl xl:text-4xl font-bold text-white placeholder-blue-200 focus:ring-0 px-0 leading-tight focus:outline-none"
                placeholder="Name your program"
              />
            </div>
            <div className="flex flex-wrap gap-4 shrink-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                <span className="text-xs text-blue-100">Duration</span>
                <span className="font-medium">
                  {totalDuration} {totalDuration === 1 ? "Week" : "Weeks"}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col gap-2 min-w-0 flex-1 basis-[200px]">
                <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider">
                  Access Type
                </span>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessType"
                      value="free"
                      checked={program.accessType === "free"}
                      onChange={() => setAccessType("free")}
                      className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                    />
                    <span className="text-sm font-medium">Free</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessType"
                      value="assigned"
                      checked={program.accessType === "assigned"}
                      onChange={() => setAccessType("assigned")}
                      className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                    />
                    <span className="text-sm font-medium">Custom</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessType"
                      value="paid"
                      checked={program.accessType === "paid"}
                      onChange={() => setAccessType("paid")}
                      className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                    />
                    <span className="text-sm font-medium">Paid</span>
                  </label>
                </div>
                {program.accessType === "paid" && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-100">Price ($)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={program.price ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrice(
                          val === "" ? null : Math.max(0, parseFloat(val) || 0)
                        );
                      }}
                      placeholder="0.00"
                      className="w-24 bg-white/20 border border-white/30 rounded px-2 py-1 text-sm font-medium text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="text-blue-100 text-xs font-semibold uppercase tracking-wider">
              Program Description
            </label>
            <textarea
              value={program.description}
              onChange={(e) => setProgramDescription(e.target.value)}
              rows={8}
              className="w-full mt-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 resize-y min-h-[120px]"
              placeholder="Describe your program (goals, focus areas, who it's for...)"
            />
          </div>
        </div>
      </div>
    </aside>
  );

  const renderBannerHeader = () => (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-lg text-white mb-8">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div>
            {isEditing ? (
              <input
                type="text"
                value={program.name}
                onChange={(e) => setProgramName(e.target.value)}
                className="text-4xl font-bold text-white leading-tight bg-transparent border-none outline-none w-full focus:outline-none placeholder-white/50"
              />
            ) : (
              <h1 className="text-4xl font-bold text-white leading-tight">
                {program.name}
              </h1>
            )}
            {isEditing ? (
              <textarea
                value={program.description}
                onChange={(e) => setProgramDescription(e.target.value)}
                rows={3}
                placeholder="Program description..."
                className="text-blue-100 mt-2 text-sm max-w-xl w-full bg-transparent border border-white/30 rounded-lg px-3 py-2 outline-none placeholder:text-white/60 focus:border-white/60 resize-none"
              />
            ) : (
              program.description && (
                <p className="text-blue-100 mt-2 text-sm max-w-xl">
                  {program.description}
                </p>
              )
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
              <span className="text-xs text-blue-100">Duration</span>
              <span className="font-medium">{totalDuration} Weeks</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
              <span className="text-xs text-blue-100">Phases</span>
              <span className="font-medium">{program.phases.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
              <span className="text-xs text-blue-100">Workouts</span>
              <span className="font-medium">{totalWorkouts}</span>
            </div>
            {isEditing ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col gap-2">
                <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider">
                  Access Type
                </span>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessType"
                      value="free"
                      checked={program.accessType === "free"}
                      onChange={() => setAccessType("free")}
                      className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                    />
                    <span className="text-sm font-medium">Free</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessType"
                      value="assigned"
                      checked={program.accessType === "assigned"}
                      onChange={() => setAccessType("assigned")}
                      className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                    />
                    <span className="text-sm font-medium">Custom</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="accessType"
                      value="paid"
                      checked={program.accessType === "paid"}
                      onChange={() => setAccessType("paid")}
                      className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                    />
                    <span className="text-sm font-medium">Paid</span>
                  </label>
                </div>
                {program.accessType === "paid" && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-blue-100">Price ($)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={program.price ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrice(
                          val === "" ? null : Math.max(0, parseFloat(val) || 0)
                        );
                      }}
                      placeholder="0.00"
                      className="w-24 bg-white/20 border border-white/30 rounded px-2 py-1 text-sm font-medium text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                <span className="text-xs text-blue-100">Access</span>
                <span className="font-medium">
                  {program.accessType === "paid" && program.price != null
                    ? `Paid $${program.price}`
                    : program.accessType === "assigned"
                      ? "Custom"
                      : "Free"}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-white hover:bg-white/90 text-indigo-600 rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? "Saving..." : submitLabel || "Save Changes"}
              </button>
            </>
          ) : (
            onStartEditing && (
              <button
                onClick={onStartEditing}
                className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Program
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );

  // === Main layout ===

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        {renderSidebar()}

        {isAside ? (
          <main className="flex-1 overflow-y-auto bg-background scroll-smooth">
            <div className="mx-auto max-w-[1600px] p-4 flex flex-col gap-4 pb-32 ">
              <Link
                href={backHref}
                className="inline-flex self-start items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Programs
              </Link>
              <div className="flex flex-col xl:flex-row xl:items-start gap-8">
                <div className="flex-1 min-w-0 flex flex-col gap-8">
                  {program.phases.map((phase, phaseIdx) =>
                    renderAsidePhaseCard(phase, phaseIdx)
                  )}

                  <button
                    onClick={addPhase}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-transparent py-6 transition-all hover:border-primary hover:bg-card hover:shadow-md"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      Add New Phase
                    </span>
                  </button>
                </div>

                {renderAsideHeader()}
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-2">
            <div className="max-w-7xl mx-auto">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Programs
              </Link>

              {renderBannerHeader()}

              <div className="space-y-6">
                {program.phases
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((phase, phaseIdx) =>
                    renderBannerPhaseCard(phase, phaseIdx)
                  )}

                {isEditing && (
                  <button
                    onClick={addPhase}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-transparent py-6 transition-all hover:border-primary hover:bg-card hover:shadow-md"
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      Add New Phase
                    </span>
                  </button>
                )}
              </div>
            </div>
          </main>
        )}

        {/* Footer action bar (aside mode only) */}
        {isAside && (
          <div className="absolute bottom-0 right-0 left-0 md:left-[280px] bg-card/90 backdrop-blur-md border-t border-border px-8 py-4 z-20">
            <div className="flex items-center justify-between mx-auto max-w-[1280px]">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"></div>
              <div className="flex items-center gap-4">
                {showClearButton && (
                  <button
                    onClick={handleClearClick}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <div className="flex-1" />
                <button
                  onClick={handleSave}
                  disabled={saving || !program.name.trim()}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : submitLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workout Editor Modal — for day workouts */}
        {selectedSlot && (
          <WorkoutEditorModal
            isOpen={true}
            workoutName={
              program.phases[selectedSlot.phaseIdx]?.workouts[
                selectedSlot.dayIdx
              ]?.workoutName || "New Workout"
            }
            exercises={
              (program.phases[selectedSlot.phaseIdx]?.workouts[
                selectedSlot.dayIdx
              ]?.exercises || []).map(
                (ex): ModalExercise => ({
                  id: ex.exerciseId,
                  name: ex.exerciseName,
                  muscleGroup: "",
                  musclesInvolved: ex.musclesInvolved || [],
                  equipment: "",
                  difficulty: "",
                  sets: ex.sets,
                  repsRange: ex.repsRange,
                })
              )
            }
            groupedExercises={
              groupedExercises as unknown as Record<string, ModalExercise[]>
            }
            muscleGroupOrder={muscleGroupOrder}
            loadingExercises={loadingExercises}
            onClose={handleWorkoutModalClose}
            onTemplateSaved={fetchWorkoutTemplates}
          />
        )}

        {/* Workout Editor Modal — for library workouts (banner variant) */}
        {selectedLibraryWorkout && isBanner && (
          <WorkoutEditorModal
            isOpen={true}
            workoutName={selectedLibraryWorkout.workoutName}
            exercises={selectedLibraryWorkout.exercises || []}
            groupedExercises={
              groupedExercises as unknown as Record<string, ModalExercise[]>
            }
            muscleGroupOrder={muscleGroupOrder}
            loadingExercises={loadingExercises}
            onClose={handleLibraryWorkoutModalClose}
            onDelete={async () => {
              try {
                await deleteDoc(
                  doc(db, "workouts", selectedLibraryWorkout.id)
                );
                await fetchWorkoutTemplates();
                setSelectedLibraryWorkout(null);
              } catch (err) {
                console.error("Error deleting workout:", err);
                alert("Failed to delete workout. Please try again.");
              }
            }}
          />
        )}

        {/* Template preview modal (aside variant only) */}
        {selectedTemplate && isAside && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-start justify-between border-b border-border px-6 py-4">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Workout Template
                  </p>
                  {selectedTemplate.category === "saved" ? (
                    <input
                      type="text"
                      value={templateNameDraft}
                      onChange={(e) => setTemplateNameDraft(e.target.value)}
                      className="mt-1 w-full text-xl font-bold text-card-foreground bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none px-0 py-1 transition-colors"
                      placeholder="Workout name"
                    />
                  ) : (
                    <h3 className="mt-1 text-xl font-bold text-card-foreground">
                      {selectedTemplate.name}
                    </h3>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{selectedTemplate.exercises} exercises</span>
                    <span>•</span>
                    <span>{selectedTemplate.duration} min</span>
                    <span>•</span>
                    <span className="capitalize">{selectedTemplate.category}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowDeleteTemplateConfirm(false);
                  }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close template preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                {selectedTemplate.description &&
                selectedTemplate.description.trim() ? (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {selectedTemplate.description}
                  </p>
                ) : null}

                {selectedTemplate.tags && selectedTemplate.tags.length > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {selectedTemplate.templateExercises &&
                selectedTemplate.templateExercises.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTemplate.templateExercises.map(
                      (exercise, index) => (
                        <div
                          key={`${selectedTemplate.id}-${exercise.exerciseName}-${index}`}
                          className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                        >
                          <p className="text-sm font-semibold text-card-foreground">
                            {index + 1}. {exercise.exerciseName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {exercise.targetSets ?? "-"} sets •{" "}
                            {exercise.targetReps || "-"} reps
                            {exercise.restPeriod
                              ? ` • rest ${exercise.restPeriod}`
                              : ""}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No exercise-level details saved for this template yet.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <div className="flex items-center gap-2">
                  {selectedTemplate.category === "saved" && (
                    <>
                      {templateNameDraft !== selectedTemplate.name && (
                        <button
                          onClick={async () => {
                            if (!templateNameDraft.trim()) return;
                            try {
                              setSavingTemplateName(true);
                              await updateDoc(
                                doc(db, "workouts", selectedTemplate.id),
                                {
                                  name: templateNameDraft.trim(),
                                }
                              );
                              setSelectedTemplate((prev) =>
                                prev
                                  ? { ...prev, name: templateNameDraft.trim() }
                                  : null
                              );
                              await fetchWorkoutTemplates();
                            } catch (err) {
                              console.error("Error updating workout name:", err);
                              alert(
                                "Failed to update workout name. Please try again."
                              );
                            } finally {
                              setSavingTemplateName(false);
                            }
                          }}
                          disabled={savingTemplateName}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {savingTemplateName ? "Saving..." : "Save Name"}
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteTemplateConfirm(true)}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Workout
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowDeleteTemplateConfirm(false);
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTemplate &&
          selectedTemplate.category === "saved" &&
          isAside && (
            <ConfirmModal
              isOpen={showDeleteTemplateConfirm}
              onClose={() => setShowDeleteTemplateConfirm(false)}
              onConfirm={async () => {
                try {
                  await deleteDoc(doc(db, "workouts", selectedTemplate.id));
                  await fetchWorkoutTemplates();
                  setSelectedTemplate(null);
                  setShowDeleteTemplateConfirm(false);
                } catch (err) {
                  console.error("Error deleting workout:", err);
                  alert("Failed to delete workout. Please try again.");
                  throw err;
                }
              }}
              title="Delete Workout"
              message={
                <>
                  <p className="mb-1">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-card-foreground">
                      {selectedTemplate.name}
                    </span>
                    ?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This action cannot be undone.
                  </p>
                </>
              }
              confirmLabel="Delete Workout"
            />
          )}

        <ConfirmModal
          isOpen={phasePendingDeleteIdx !== null}
          onClose={() => setPhasePendingDeleteIdx(null)}
          onConfirm={async () => {
            if (phasePendingDeleteIdx !== null) {
              deletePhase(phasePendingDeleteIdx);
              setPhasePendingDeleteIdx(null);
            }
          }}
          title="Delete phase"
          message={
            phasePendingDeleteIdx !== null ? (
              <>
                <p className="mb-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-card-foreground">
                    {program.phases[phasePendingDeleteIdx]?.name.trim() ||
                      "this phase"}
                  </span>
                  ?
                </p>
                <p className="text-xs text-muted-foreground">
                  This cannot be undone.
                </p>
              </>
            ) : null
          }
          confirmLabel="Delete phase"
        />

        <PhaseDescriptionModal
          isOpen={phaseDescriptionModalIdx !== null}
          onClose={() => setPhaseDescriptionModalIdx(null)}
          title={
            phaseDescriptionModalIdx !== null
              ? `Phase Description — ${program.phases[phaseDescriptionModalIdx]?.name ?? ""}`
              : ""
          }
          subtitle="Describe the focus and goals for this phase"
          value={phaseDescriptionDraft}
          onChange={setPhaseDescriptionDraft}
          onSave={() => {
            if (phaseDescriptionModalIdx !== null) {
              updatePhaseDescription(
                phaseDescriptionModalIdx,
                phaseDescriptionDraft
              );
              setPhaseDescriptionModalIdx(null);
            }
          }}
          placeholder="Define the focus for this phase..."
        />
      </div>
    </div>
  );
}
