"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  GripVertical,
  Hotel,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
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
  type WorkoutTemplate,
} from "../lib/useProgramEditor";

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface ProgramBuilderProps {
  initialProgram?: Partial<ProgramFormData>;
  draftKey?: string;
  submitLabel?: string;
  saving?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
  onSave: (data: ProgramFormData) => void | Promise<void>;
  backHref?: string;
}

export default function ProgramBuilder({
  initialProgram,
  draftKey,
  submitLabel = "Save",
  saving = false,
  showClearButton = false,
  onClear,
  onSave,
  backHref = "/programs",
}: ProgramBuilderProps) {
  const editor = useProgramEditor({ initialProgram, draftKey });

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
    dropTemplateOnDay,
    applyWorkoutEdit,
    resetProgram,
    loadingExercises,
    groupedExercises,
    savedTemplates,
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
    selectedSlot,
    setSelectedSlot,
    selectedTemplate,
    setSelectedTemplate,
    phaseDescriptionModalIdx,
    setPhaseDescriptionModalIdx,
    phaseDescriptionDraft,
    setPhaseDescriptionDraft,
    phaseMenuOpenId,
    setPhaseMenuOpenId,
    phasePendingDeleteIdx,
    setPhasePendingDeleteIdx,
  } = editor;

  // Template preview rename draft
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

  const totalDuration = useMemo(
    () => program.phases.reduce((acc, p) => acc + p.durationWeeks, 0),
    [program.phases]
  );

  // === Handlers ===

  const handleTemplateDragStart = (
    e: React.DragEvent,
    template: WorkoutTemplate
  ) => {
    e.dataTransfer.setData("template", JSON.stringify(template));
  };

  const handleDayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDayDrop = (
    e: React.DragEvent,
    phaseIdx: number,
    dayIdx: number
  ) => {
    e.preventDefault();

    const templateRaw = e.dataTransfer.getData("template");
    if (!templateRaw) return;

    try {
      const template = JSON.parse(templateRaw) as WorkoutTemplate;
      dropTemplateOnDay(phaseIdx, dayIdx, template);
    } catch (err) {
      console.error("Failed to drop template:", err);
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

  const openTemplateModal = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setTemplateNameDraft(template.name);
  };

  const handleSave = async () => {
    if (saving) return;
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
    try {
      await onSave({ ...program, name: trimmedName });
    } catch (err) {
      console.error("Save program failed:", err);
      const message =
        err instanceof Error ? err.message : "Something went wrong while saving.";
      alert(message);
    }
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
    <aside className="w-[280px] shrink-0 flex flex-col bg-card border-r border-border z-10">
      {/* Sidebar Header / Search */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border-none rounded-lg bg-muted text-sm placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:bg-card transition-all"
            placeholder="Search library..."
          />
        </div>

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
      </div>

      {/* Draggable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sidebarTab === "templates"
          ? renderAsideTemplateList()
          : renderAsideExerciseList()}
      </div>

      <div className="p-4 border-t border-border">
        <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <Plus className="w-4 h-4" />
          Create New Template
        </button>
      </div>
    </aside>
  );

  const renderTemplateRow = (template: WorkoutTemplate) => (
    <div
      key={template.id}
      className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
      draggable
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

  // === Day card renderer ===

  const renderDayCard = (phaseIdx: number, globalDayIdx: number) => {
    const workout = program.phases[phaseIdx].workouts[globalDayIdx];
    if (!workout) return null;

    const hasExercises = (workout.exercises || []).length > 0;

    if (workout.isRestDay) {
      return (
        <div
          key={globalDayIdx}
          className="flex h-full flex-col gap-2"
          onDragOver={handleDayDragOver}
          onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
        >
          <div className="group relative flex h-full flex-col items-center justify-center text-muted-foreground">
            <button
              onClick={() => clearDay(phaseIdx, globalDayIdx)}
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
              title="Remove rest day"
            >
              <X className="w-4 h-4" />
            </button>
            <Hotel className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Rest Day</span>
          </div>
        </div>
      );
    }

    if (!workout.workoutName) {
      return (
        <div
          key={globalDayIdx}
          className="flex flex-col gap-2"
          onDragOver={handleDayDragOver}
          onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
        >
          <div
            className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group bg-card relative"
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

    return (
      <div
        key={globalDayIdx}
        className="flex h-full flex-col gap-2"
        onDragOver={handleDayDragOver}
        onDrop={(e) => handleDayDrop(e, phaseIdx, globalDayIdx)}
      >
        <div
          className="group relative flex h-full flex-col cursor-pointer gap-2"
          onClick={() => openWorkoutModal(phaseIdx, globalDayIdx)}
        >
          <div className="flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearDay(phaseIdx, globalDayIdx);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
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
                      {renderDayCard(phaseIdx, idx)}
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

  // === Header renderer ===

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

  // === Main layout ===

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        {renderSidebar()}

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

        {/* Footer action bar (z-40 so it sits above main scroll content; modals use z-50) */}
        <div className="pointer-events-auto absolute bottom-0 right-0 left-0 z-40 bg-card/90 backdrop-blur-md border-t border-border px-8 py-4 md:left-[280px]">
          <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-3">
            {showClearButton && (
              <button
                type="button"
                onClick={handleClearClick}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </div>

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

        {/* Template preview modal */}
        {selectedTemplate && (
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

        {selectedTemplate && selectedTemplate.category === "saved" && (
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
