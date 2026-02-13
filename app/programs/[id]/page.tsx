"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Clock,
  Dumbbell,
  Hotel,
  ChevronDown,
  ChevronRight,
  Users,
  Edit,
  Copy,
  Trash2,
  Play,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

interface ExerciseData {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  repsRange: string;
  tempo?: string;
  restPeriod: string;
  notes: string | null;
  isSuperset?: boolean;
  supersetGroup?: string;
}

interface WorkoutData {
  dayNumber: number;
  dayName: string;
  isRestDay: boolean;
  workoutId: string | null;
  workoutName: string | null;
  description?: string;
  estimatedDuration?: number;
  exercises: ExerciseData[];
}

interface PhaseData {
  phaseId: string;
  name: string;
  description: string;
  order: number;
  durationWeeks: number;
  focusAreas: string[];
  workouts: WorkoutData[];
}

interface ProgramDetail {
  id: string;
  name: string;
  description: string;
  totalDuration: number;
  daysPerWeek: number;
  difficulty: string;
  coverImage: string;
  createdBy: string;
  createdAt: any;
  isActive: boolean;
  phases: PhaseData[];
}

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = params?.id as string;

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProgram = async () => {
      if (!programId) return;

      try {
        setLoading(true);
        const programDoc = await getDoc(doc(db, "programs", programId));

        if (programDoc.exists()) {
          const data = programDoc.data();
          const programData: ProgramDetail = {
            id: programDoc.id,
            name: data.name || "Untitled Program",
            description: data.description || "",
            totalDuration: data.totalDuration || 0,
            daysPerWeek: data.daysPerWeek || 7,
            difficulty: data.difficulty || "intermediate",
            coverImage: data.coverImage || "",
            createdBy: data.createdBy || "Unknown",
            createdAt: data.createdAt,
            isActive: data.isActive ?? true,
            phases: (data.phases || []).map((phase: any, idx: number) => ({
              phaseId: phase.phaseId || `phase_${idx}`,
              name: phase.name || `Phase ${idx + 1}`,
              description: phase.description || "",
              order: phase.order ?? idx,
              durationWeeks: phase.durationWeeks || 1,
              focusAreas: phase.focusAreas || [],
              workouts: (phase.workouts || []).map((w: any) => ({
                dayNumber: w.dayNumber || 0,
                dayName: w.dayName || "",
                isRestDay: w.isRestDay || false,
                workoutId: w.workoutId || null,
                workoutName: w.workoutName || null,
                description: w.description || "",
                estimatedDuration: w.estimatedDuration || 0,
                exercises: (w.exercises || []).map((ex: any) => ({
                  exerciseId: ex.exerciseId || "",
                  exerciseName: ex.exerciseName || "Unknown Exercise",
                  order: ex.order || 0,
                  sets: ex.sets || 0,
                  repsRange: ex.repsRange || "",
                  tempo: ex.tempo || "",
                  restPeriod: ex.restPeriod || "",
                  notes: ex.notes || null,
                  isSuperset: ex.isSuperset || false,
                  supersetGroup: ex.supersetGroup || "",
                })),
              })),
            })),
          };

          setProgram(programData);

          // Auto-expand first phase
          if (programData.phases.length > 0) {
            setExpandedPhases(new Set([programData.phases[0].phaseId]));
          }

          setError(null);
        } else {
          setError("Program not found");
        }
      } catch (err) {
        console.error("Error fetching program:", err);
        setError("Failed to load program");
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [programId]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const toggleWorkout = (workoutKey: string) => {
    setExpandedWorkouts((prev) => {
      const next = new Set(prev);
      if (next.has(workoutKey)) next.delete(workoutKey);
      else next.add(workoutKey);
      return next;
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
      case "intermediate":
        return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
      case "advanced":
        return "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading program...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Program not found"}</p>
            <Link
              href="/programs"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Programs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Calculate stats
  const totalWorkouts = program.phases.reduce(
    (acc, phase) => acc + phase.workouts.filter((w) => w.workoutName && !w.isRestDay).length,
    0
  );
  const totalExercises = program.phases.reduce(
    (acc, phase) =>
      acc + phase.workouts.reduce((wAcc, w) => wAcc + (w.exercises?.length || 0), 0),
    0
  );
  const totalRestDays = program.phases.reduce(
    (acc, phase) => acc + phase.workouts.filter((w) => w.isRestDay).length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Back Button */}
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Programs
          </Link>

          {/* Program Header Card */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-lg text-white mb-8">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div>

                  <h1 className="text-4xl font-bold text-white leading-tight">
                    {program.name}
                  </h1>
                  {program.description && (
                    <p className="text-blue-100 mt-2 text-sm max-w-xl">
                      {program.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Duration</span>
                    <span className="font-medium">{program.totalDuration} Weeks</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Phases</span>
                    <span className="font-medium">{program.phases.length}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Workouts</span>
                    <span className="font-medium">{totalWorkouts}</span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                    <span className="text-xs text-blue-100">Exercises</span>
                    <span className="font-medium">{totalExercises}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/programs/builder?edit=${program.id}`}
                  className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Program
                </Link>
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-6">
            {program.phases
              .sort((a, b) => a.order - b.order)
              .map((phase) => {
                const isExpanded = expandedPhases.has(phase.phaseId);
                const phaseWorkoutCount = phase.workouts.filter(
                  (w) => w.workoutName && !w.isRestDay
                ).length;
                const phaseExerciseCount = phase.workouts.reduce(
                  (acc, w) => acc + (w.exercises?.length || 0),
                  0
                );

                // Group workouts into weeks of 7
                const weeks: WorkoutData[][] = [];
                for (let i = 0; i < phase.workouts.length; i += 7) {
                  weeks.push(phase.workouts.slice(i, i + 7));
                }

                return (
                  <div
                    key={phase.phaseId}
                    className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
                  >
                    {/* Phase Header */}
                    <button
                      onClick={() => togglePhase(phase.phaseId)}
                      className="w-full flex items-center justify-between px-6 py-5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <h2 className="text-lg font-bold text-card-foreground">
                            {phase.name}
                          </h2>
                          {phase.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {phase.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm font-medium text-card-foreground">
                            {phase.durationWeeks} {phase.durationWeeks === 1 ? "Week" : "Weeks"}
                          </span>
                        </div>
                        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{phaseWorkoutCount} workouts</span>
                          <span>•</span>
                          <span>{phaseExerciseCount} exercises</span>
                        </div>
                      </div>
                    </button>

                    {/* Phase Content */}
                    {isExpanded && (
                      <div className="border-t border-border">
                        {weeks.map((week, weekIdx) => (
                          <div key={weekIdx} className="p-6">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                              Week {weekIdx + 1}
                            </h3>
                            <div className="grid grid-cols-7 gap-3">
                              {/* Day Headers */}
                              {dayNames.map((day) => (
                                <div key={day} className="text-center">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    {day}
                                  </span>
                                </div>
                              ))}

                              {/* Day Cards */}
                              {week.map((workout, dayIdx) => {
                                const workoutKey = `${phase.phaseId}_${weekIdx}_${dayIdx}`;
                                const isWorkoutExpanded = expandedWorkouts.has(workoutKey);
                                const hasExercises = workout.exercises && workout.exercises.length > 0;

                                if (workout.isRestDay) {
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground"
                                    >
                                      <Hotel className="w-5 h-5 mb-1" />
                                      <span className="text-xs font-medium">Rest Day</span>
                                    </div>
                                  );
                                }

                                if (!workout.workoutName) {
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground/50"
                                    >
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={dayIdx}
                                    className="flex flex-col rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => hasExercises && toggleWorkout(workoutKey)}
                                  >
                                    <div className="p-3 flex flex-col gap-1.5 h-28">
                                      <p className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2">
                                        {workout.workoutName}
                                      </p>
                                      {workout.estimatedDuration ? (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          {workout.estimatedDuration} min
                                        </div>
                                      ) : null}
                                      {hasExercises && (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-auto">
                                          <Dumbbell className="w-3 h-3" />
                                          {workout.exercises.length} exercises
                                          {isWorkoutExpanded ? (
                                            <ChevronDown className="w-3 h-3 ml-auto" />
                                          ) : (
                                            <ChevronRight className="w-3 h-3 ml-auto" />
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Expanded Exercise List */}
                                    {isWorkoutExpanded && hasExercises && (
                                      <div className="border-t border-indigo-200 dark:border-indigo-800 bg-card/80 divide-y divide-border/50">
                                        {workout.exercises
                                          .sort((a, b) => a.order - b.order)
                                          .map((exercise, exIdx) => (
                                            <div
                                              key={exIdx}
                                              className="px-3 py-2 text-xs"
                                            >
                                              <p className="font-medium text-card-foreground truncate">
                                                {exercise.exerciseName}
                                              </p>
                                              <p className="text-muted-foreground mt-0.5">
                                                {exercise.sets} × {exercise.repsRange}
                                                {exercise.restPeriod && (
                                                  <span> · {exercise.restPeriod} rest</span>
                                                )}
                                              </p>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Phase Footer */}
                        <div className="bg-muted/50 px-6 py-3 border-t border-border flex items-center justify-between">
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Total Workouts: {phaseWorkoutCount}</span>
                            <span>
                              Total Exercises: {phaseExerciseCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
