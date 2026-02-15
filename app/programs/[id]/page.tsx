"use client";

import { useState, useEffect, useMemo } from "react";
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
  Plus,
  Search,
  GripVertical,
  X,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

// === Types ===

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

interface EditExercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: string;
  sets?: number;
  repsRange?: string;
}

interface SelectedWorkoutEdit {
  phaseIdx: number;
  dayIdx: number;
}

// === Muscle group helpers (same as builder) ===

const muscleGroupOrder = [
  "Chest", "Back", "Shoulders", "Arms", "Legs", "Core", "Full Body", "Cardio", "Other"
];

const muscleToCategory: Record<string, string> = {
  "chest": "Chest", "pectorals": "Chest", "pecs": "Chest", "upper chest": "Chest", "lower chest": "Chest",
  "back": "Back", "lats": "Back", "latissimus dorsi": "Back", "rhomboids": "Back", "traps": "Back", "trapezius": "Back", "lower back": "Back", "erector spinae": "Back", "rear delts": "Back", "upper back": "Back", "mid back": "Back",
  "shoulders": "Shoulders", "delts": "Shoulders", "deltoids": "Shoulders", "front delts": "Shoulders", "side delts": "Shoulders", "lateral delts": "Shoulders", "anterior deltoid": "Shoulders", "posterior deltoid": "Shoulders", "rotator cuff": "Shoulders",
  "arms": "Arms", "biceps": "Arms", "triceps": "Arms", "forearms": "Arms", "brachialis": "Arms", "bicep": "Arms", "tricep": "Arms", "forearm": "Arms", "wrists": "Arms",
  "legs": "Legs", "quads": "Legs", "quadriceps": "Legs", "hamstrings": "Legs", "glutes": "Legs", "gluteus": "Legs", "calves": "Legs", "calf": "Legs", "hip flexors": "Legs", "adductors": "Legs", "abductors": "Legs", "thighs": "Legs", "lower body": "Legs",
  "core": "Core", "abs": "Core", "abdominals": "Core", "obliques": "Core", "lower abs": "Core", "upper abs": "Core", "transverse abdominis": "Core", "hip": "Core", "pelvis": "Core",
  "full body": "Full Body", "compound": "Full Body", "total body": "Full Body", "whole body": "Full Body",
  "cardio": "Cardio", "cardiovascular": "Cardio", "heart": "Cardio", "conditioning": "Cardio", "endurance": "Cardio",
};

const getCategoryFromMuscle = (muscle: string): string => {
  if (!muscle) return "Other";
  const normalized = muscle.toLowerCase().trim();
  if (muscleToCategory[normalized]) return muscleToCategory[normalized];
  for (const [key, category] of Object.entries(muscleToCategory)) {
    if (normalized.includes(key) || key.includes(normalized)) return category;
  }
  for (const category of muscleGroupOrder) {
    if (normalized.includes(category.toLowerCase())) return category;
  }
  return "Other";
};

// === Component ===

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = params?.id as string;

  // Core state
  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProgram, setEditedProgram] = useState<ProgramDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Exercise library state
  const [exercises, setExercises] = useState<EditExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Workout modal state
  const [selectedWorkoutEdit, setSelectedWorkoutEdit] = useState<SelectedWorkoutEdit | null>(null);
  const [modalExercises, setModalExercises] = useState<EditExercise[]>([]);
  const [modalWorkoutName, setModalWorkoutName] = useState("");
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalExpandedGroups, setModalExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedExerciseIndex, setDraggedExerciseIndex] = useState<number | null>(null);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // === Fetch program ===
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

  // === Fetch exercises when entering edit mode ===
  useEffect(() => {
    if (!isEditing) return;
    if (exercises.length > 0) return; // Already loaded

    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const exercisesSnapshot = await getDocs(collection(db, "exercises"));

        if (!exercisesSnapshot.empty) {
          const fetched: EditExercise[] = exercisesSnapshot.docs.map((doc) => {
            const data = doc.data();
            let rawMuscle = data.muscleGroup || data.muscle_group || data.muscle || data.muscles ||
              data.target || data.bodyPart || data.primaryMuscle || data.primary_muscle ||
              data.musclesInvolved || data.muscles_involved || data.muscleGroups ||
              data.muscle_groups || data.category || data.primaryGroup || "";

            if (Array.isArray(rawMuscle) && rawMuscle.length > 0) rawMuscle = rawMuscle[0];
            else if (rawMuscle && typeof rawMuscle === "object") {
              const muscleObj = rawMuscle as any;
              rawMuscle = muscleObj.name || muscleObj.title || muscleObj.slug || "";
            }

            return {
              id: doc.id,
              name: data.name || "Unnamed Exercise",
              muscleGroup: getCategoryFromMuscle(String(rawMuscle)),
              equipment: data.equipment || "None",
              difficulty: data.difficulty || "intermediate",
            };
          });
          setExercises(fetched);
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, [isEditing, exercises.length]);

  // Group exercises by muscle group
  const groupedExercises = useMemo(() => {
    const groups: Record<string, EditExercise[]> = {};
    muscleGroupOrder.forEach(group => { groups[group] = []; });
    exercises.forEach(exercise => {
      const group = muscleGroupOrder.includes(exercise.muscleGroup) ? exercise.muscleGroup : "Other";
      groups[group].push(exercise);
    });
    return groups;
  }, [exercises]);

  // Auto-expand modal groups when searching
  useEffect(() => {
    if (!modalSearchQuery.trim()) return;
    const groupsWithMatches = new Set<string>();
    Object.entries(groupedExercises).forEach(([group, exs]) => {
      const hasMatch = exs.some(ex =>
        ex.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
        ex.equipment.toLowerCase().includes(modalSearchQuery.toLowerCase())
      );
      if (hasMatch) groupsWithMatches.add(group);
    });
    setModalExpandedGroups(groupsWithMatches);
  }, [modalSearchQuery, groupedExercises]);

  // === Toggle functions ===
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

  // === Edit mode functions ===
  const startEditing = () => {
    setEditedProgram(JSON.parse(JSON.stringify(program)));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedProgram(null);
    setIsEditing(false);
  };

  const saveChanges = async () => {
    if (!editedProgram || !programId) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, "programs", programId), {
        name: editedProgram.name,
        phases: editedProgram.phases.map((phase) => ({
          ...phase,
        })),
      });
      setProgram(editedProgram);
      setIsEditing(false);
      setEditedProgram(null);
    } catch (err) {
      console.error("Error saving program:", err);
    } finally {
      setSaving(false);
    }
  };

  const updatePhaseName = (phaseIdx: number, value: string) => {
    if (!editedProgram) return;
    const updated = { ...editedProgram };
    updated.phases = [...updated.phases];
    updated.phases[phaseIdx] = { ...updated.phases[phaseIdx], name: value };
    setEditedProgram(updated);
  };

  const updatePhaseDescription = (phaseIdx: number, value: string) => {
    if (!editedProgram) return;
    const updated = { ...editedProgram };
    updated.phases = [...updated.phases];
    updated.phases[phaseIdx] = { ...updated.phases[phaseIdx], description: value };
    setEditedProgram(updated);
  };

  const addPhase = () => {
    if (!editedProgram) return;
    const newPhase: PhaseData = {
      phaseId: `phase_${Date.now()}`,
      name: `Phase ${editedProgram.phases.length + 1}`,
      description: "",
      order: editedProgram.phases.length,
      durationWeeks: 1,
      focusAreas: [],
      workouts: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        dayName: dayNames[i],
        isRestDay: false,
        workoutId: null,
        workoutName: null,
        description: "",
        estimatedDuration: 0,
        exercises: [],
      })),
    };
    setEditedProgram({
      ...editedProgram,
      phases: [...editedProgram.phases, newPhase],
    });
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.add(newPhase.phaseId);
      return next;
    });
  };

  // === Rest day / Clear day ===
  const setRestDay = (phaseIdx: number, dayIdx: number) => {
    if (!editedProgram) return;
    const updated = JSON.parse(JSON.stringify(editedProgram));
    updated.phases[phaseIdx].workouts[dayIdx] = {
      ...updated.phases[phaseIdx].workouts[dayIdx],
      isRestDay: true,
      workoutId: null,
      workoutName: null,
      exercises: [],
    };
    setEditedProgram(updated);
  };

  const clearDay = (phaseIdx: number, dayIdx: number) => {
    if (!editedProgram) return;
    const updated = JSON.parse(JSON.stringify(editedProgram));
    updated.phases[phaseIdx].workouts[dayIdx] = {
      ...updated.phases[phaseIdx].workouts[dayIdx],
      isRestDay: false,
      workoutId: null,
      workoutName: null,
      exercises: [],
    };
    setEditedProgram(updated);
  };

  // === Workout modal handlers ===
  const openWorkoutModal = (phaseIdx: number, dayIdx: number) => {
    if (!editedProgram) return;
    const workout = editedProgram.phases[phaseIdx].workouts[dayIdx];

    // Convert ExerciseData[] to EditExercise[] for the modal
    const existingExercises: EditExercise[] = (workout.exercises || []).map(ex => ({
      id: ex.exerciseId,
      name: ex.exerciseName,
      muscleGroup: "",
      equipment: "",
      difficulty: "",
      sets: ex.sets,
      repsRange: ex.repsRange,
    }));

    setSelectedWorkoutEdit({ phaseIdx, dayIdx });
    setModalExercises(existingExercises);
    setModalWorkoutName(workout.workoutName || "New Workout");
  };

  const closeWorkoutModal = () => {
    if (selectedWorkoutEdit && editedProgram) {
      const { phaseIdx, dayIdx } = selectedWorkoutEdit;
      const updated = JSON.parse(JSON.stringify(editedProgram));
      const currentWorkout = updated.phases[phaseIdx].workouts[dayIdx];

      if (modalExercises.length > 0) {
        updated.phases[phaseIdx].workouts[dayIdx] = {
          ...currentWorkout,
          isRestDay: false,
          workoutId: currentWorkout.workoutId || `workout_${phaseIdx}_${dayIdx}`,
          workoutName: modalWorkoutName || "New Workout",
          estimatedDuration: modalExercises.length * 5,
          exercises: modalExercises.map((ex, i) => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            order: i,
            sets: ex.sets || 3,
            repsRange: ex.repsRange || "8-12",
            tempo: "",
            restPeriod: "60s",
            notes: null,
            isSuperset: false,
            supersetGroup: "",
          })),
        };
      } else if (modalWorkoutName && modalWorkoutName !== "New Workout") {
        // Keep the workout name even if no exercises yet
        updated.phases[phaseIdx].workouts[dayIdx] = {
          ...currentWorkout,
          isRestDay: false,
          workoutId: currentWorkout.workoutId || `workout_${phaseIdx}_${dayIdx}`,
          workoutName: modalWorkoutName,
          exercises: [],
        };
      }

      setEditedProgram(updated);
    }

    setSelectedWorkoutEdit(null);
    setModalExercises([]);
    setModalSearchQuery("");
    setModalExpandedGroups(new Set());
    setModalWorkoutName("");
    setDraggedExerciseIndex(null);
  };

  const addExerciseToWorkout = (exercise: EditExercise) => {
    setModalExercises(prev => [...prev, { ...exercise, sets: exercise.sets || 3, repsRange: exercise.repsRange || "8-12" }]);
  };

  const updateExerciseInWorkout = (index: number, field: keyof EditExercise, value: any) => {
    setModalExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const removeExerciseFromWorkout = (index: number) => {
    setModalExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleModalExerciseDragStart = (index: number) => {
    setDraggedExerciseIndex(index);
  };

  const handleModalExerciseDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedExerciseIndex === null || draggedExerciseIndex === index) return;
    const newExercises = [...modalExercises];
    const [draggedItem] = newExercises.splice(draggedExerciseIndex, 1);
    newExercises.splice(index, 0, draggedItem);
    setModalExercises(newExercises);
    setDraggedExerciseIndex(index);
  };

  const handleModalExerciseDragEnd = () => {
    setDraggedExerciseIndex(null);
  };

  // === Helpers ===
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

  // === Early returns ===
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
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedProgram?.name || ""}
                      onChange={(e) => setEditedProgram(editedProgram ? { ...editedProgram, name: e.target.value } : null)}
                      className="text-4xl font-bold text-white leading-tight bg-transparent border-none outline-none w-full focus:outline-none placeholder-white/50"
                    />
                  ) : (
                    <h1 className="text-4xl font-bold text-white leading-tight">
                      {program.name}
                    </h1>
                  )}
                  {program.description && !isEditing && (
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
                {isEditing ? (
                  <>
                    <button
                      onClick={cancelEditing}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveChanges}
                      disabled={saving}
                      className="bg-white hover:bg-white/90 text-indigo-600 rounded-lg px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEditing}
                    className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Program
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-6">
            {(isEditing && editedProgram ? editedProgram.phases : program.phases)
              .sort((a, b) => a.order - b.order)
              .map((phase, phaseIdx) => {
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
                        <div className="text-left flex-1">
                          {isEditing ? (
                            <>
                              <input
                                type="text"
                                value={editedProgram?.phases[phaseIdx]?.name || ""}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updatePhaseName(phaseIdx, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="text-lg font-bold text-card-foreground bg-transparent border-none outline-none w-full focus:outline-none"
                              />
                              <textarea
                                value={editedProgram?.phases[phaseIdx]?.description || ""}
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
                            <div className="grid grid-cols-7 gap-3 items-start">
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
                                const globalDayIdx = weekIdx * 7 + dayIdx;
                                const workoutKey = `${phase.phaseId}_${weekIdx}_${dayIdx}`;
                                const isWorkoutExpanded = expandedWorkouts.has(workoutKey);
                                const hasExercises = workout.exercises && workout.exercises.length > 0;

                                // === REST DAY ===
                                if (workout.isRestDay) {
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="group relative flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground"
                                    >
                                      {isEditing && (
                                        <button
                                          onClick={() => clearDay(phaseIdx, globalDayIdx)}
                                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-500 transition-all"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                      <Hotel className="w-5 h-5 mb-1" />
                                      <span className="text-xs font-medium">Rest Day</span>
                                    </div>
                                  );
                                }

                                // === EMPTY DAY ===
                                if (!workout.workoutName) {
                                  if (isEditing) {
                                    return (
                                      <div
                                        key={dayIdx}
                                        className="flex h-28 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group bg-card relative"
                                        onClick={() => openWorkoutModal(phaseIdx, globalDayIdx)}
                                      >
                                        <div className="size-8 rounded-full bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-card flex items-center justify-center mb-2 transition-colors">
                                          <Plus className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Add Workout</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setRestDay(phaseIdx, globalDayIdx); }}
                                          className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-medium rounded bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400 transition-all flex items-center gap-1"
                                        >
                                          <Hotel className="w-3 h-3" />
                                          Rest Day
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      key={dayIdx}
                                      className="flex h-28 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground/50"
                                    >
                                      <span className="text-xs">Empty</span>
                                    </div>
                                  );
                                }

                                // === WORKOUT DAY ===
                                return (
                                  <div
                                    key={dayIdx}
                                    className="group relative flex flex-col rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => {
                                      if (isEditing) {
                                        openWorkoutModal(phaseIdx, globalDayIdx);
                                      } else if (hasExercises) {
                                        toggleWorkout(workoutKey);
                                      }
                                    }}
                                  >
                                    {isEditing && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); clearDay(phaseIdx, globalDayIdx); }}
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-500 transition-all z-10"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                    <div className="p-3 flex flex-col gap-1.5 h-28">
                                      <p className="text-sm font-semibold text-card-foreground leading-tight line-clamp-2">
                                        {workout.workoutName}
                                      </p>
                                      {hasExercises && (
                                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-auto">
                                          <Dumbbell className="w-3 h-3" />
                                          {workout.exercises.length} exercises
                                          {!isEditing && (
                                            isWorkoutExpanded ? (
                                              <ChevronDown className="w-3 h-3 ml-auto" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 ml-auto" />
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Expanded Exercise List (view mode only) */}
                                    {!isEditing && isWorkoutExpanded && hasExercises && (
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

              {/* Add Phase Button - only in edit mode */}
              {isEditing && (
                <button
                  onClick={addPhase}
                  className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-transparent py-6 transition-all hover:border-primary hover:bg-card hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add New Phase</span>
                </button>
              )}
          </div>
        </div>
      </main>

      {/* === Workout Editor Modal === */}
      {selectedWorkoutEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  value={modalWorkoutName}
                  onChange={(e) => setModalWorkoutName(e.target.value)}
                  className="w-full bg-transparent border-none text-xl font-bold text-white placeholder-blue-200 focus:ring-0 px-0 leading-tight focus:outline-none"
                  placeholder="Enter workout name"
                />
                <p className="text-sm text-blue-100">{modalExercises.length} exercises</p>
              </div>
              <button
                onClick={closeWorkoutModal}
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
                  <h3 className="text-sm font-semibold text-card-foreground">Workout Exercises</h3>
                  <p className="text-xs text-muted-foreground">Drag to reorder</p>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-2"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('bg-primary/5');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-primary/5');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('bg-primary/5');
                    const exerciseData = e.dataTransfer.getData("exercise");
                    if (exerciseData) {
                      const exercise = JSON.parse(exerciseData);
                      addExerciseToWorkout(exercise);
                    }
                  }}
                >
                  {modalExercises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg">
                      <Dumbbell className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No exercises yet</p>
                      <p className="text-xs">Drag exercises here or use + button →</p>
                    </div>
                  ) : (
                    modalExercises.map((exercise, index) => (
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
                            <p className="text-sm font-medium text-card-foreground truncate">{exercise.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{exercise.muscleGroup} • {exercise.equipment}</p>
                          </div>
                          <button
                            onClick={() => removeExerciseFromWorkout(index)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-500 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Sets & Reps Row */}
                        <div className="flex items-center gap-3 px-3 pb-3 pt-0">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Sets</label>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={exercise.sets || 3}
                              onChange={(e) => updateExerciseInWorkout(index, "sets", parseInt(e.target.value) || 1)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 px-1.5 py-1 text-center text-sm font-medium border border-border rounded-md bg-muted/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            />
                          </div>
                          <span className="text-muted-foreground text-sm">×</span>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Reps</label>
                            <input
                              type="text"
                              value={exercise.repsRange || "8-12"}
                              onChange={(e) => updateExerciseInWorkout(index, "repsRange", e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="8-12"
                              className="w-16 px-1.5 py-1 text-center text-sm font-medium border border-border rounded-md bg-muted/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Exercise Library */}
              <div className="w-1/2 flex flex-col bg-muted/20">
                <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-card-foreground">Exercise Library</h3>
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
                      let groupExercises = groupedExercises[group];
                      if (modalSearchQuery.trim()) {
                        groupExercises = groupExercises.filter(ex =>
                          ex.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                          ex.equipment.toLowerCase().includes(modalSearchQuery.toLowerCase())
                        );
                      }
                      if (groupExercises.length === 0) return null;

                      return (
                        <div key={group} className="border border-border rounded-lg overflow-hidden bg-card">
                          <button
                            onClick={() => {
                              setModalExpandedGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(group)) next.delete(group);
                                else next.add(group);
                                return next;
                              });
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold text-card-foreground uppercase tracking-wider"
                          >
                            <div className="flex items-center gap-2">
                              {modalExpandedGroups.has(group) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {group}
                            </div>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {groupExercises.length}
                            </span>
                          </button>

                          {modalExpandedGroups.has(group) && (
                            <div className="divide-y divide-border/50">
                              {groupExercises.map((exercise) => (
                                <div
                                  key={exercise.id}
                                  className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-grab active:cursor-grabbing"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("exercise", JSON.stringify(exercise));
                                  }}
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-card-foreground truncate">{exercise.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{exercise.equipment} • {exercise.difficulty}</p>
                                  </div>
                                  <button
                                    onClick={() => addExerciseToWorkout(exercise)}
                                    className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
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
                {modalExercises.length} exercise{modalExercises.length !== 1 ? "s" : ""} in workout
              </p>
              <button
                onClick={closeWorkoutModal}
                className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
