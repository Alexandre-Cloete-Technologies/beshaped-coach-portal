"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  GripVertical,
  Info,
  Plus,
  ChevronDown,
  ChevronRight,
  X,
  ArrowLeft,
  Clock,
  Hotel,
  Edit,
  MoreHorizontal,
  CheckCircle,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import WorkoutEditorModal, { ModalExercise } from "../../components/WorkoutEditorModal";
import PhaseDescriptionModal from "../../components/PhaseDescriptionModal";
import ConfirmModal from "../../components/ConfirmModal";
import Navbar from "../../components/Navbar";

type TemplateCategory = "recent" | "strength" | "saved";

type AccessType = "free" | "paid" | "assigned";

interface WorkoutTemplateExercise {
  exerciseId?: string;
  exerciseName: string;
  targetSets?: number;
  targetReps?: string;
  restPeriod?: string;
  notes?: string | null;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: number;
  duration: number;
  category: TemplateCategory;
  description?: string;
  tags?: string[];
  templateExercises?: WorkoutTemplateExercise[];
}

// Mock template data
const mockTemplates: WorkoutTemplate[] = [
  { id: "1", name: "Upper Body Power", exercises: 4, duration: 45, category: "recent" },
  { id: "2", name: "Leg Day Hypertrophy", exercises: 6, duration: 60, category: "recent" },
  { id: "3", name: "Full Body Circuit", exercises: 8, duration: 30, category: "recent" },
  { id: "4", name: "5x5 Stronglifts A", exercises: 3, duration: 50, category: "strength" },
  { id: "5", name: "Deadlift Focus", exercises: 4, duration: 45, category: "strength" },
];

interface PhaseDay {
  type: "workout" | "rest" | "empty";
  workoutName?: string;
  duration?: number;
  label?: string;
  exercises?: ModalExercise[];
}

interface Phase {
  id: string;
  name: string;
  description: string;
  weeks: string;
  days: PhaseDay[];
  isExpanded: boolean;
  durationWeeks: number;
}

interface SelectedWorkout {
  phaseId: string;
  dayIndex: number;
  workout: PhaseDay;
}

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  musclesInvolved?: string[];
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description?: string;
  instructions?: string[];
  videoUrl?: string;
  createdAt?: Date;
  sets?: number;
  repsRange?: string;
}

// Define muscle group order
const muscleGroupOrder = [
  "Chest",
  "Back", 
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Full Body",
  "Cardio",
  "Other"
];

const PROGRAM_BUILDER_DRAFT_KEY = "program-builder-draft";

const mockExercises: Exercise[] = [
  { id: "1", name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell", difficulty: "intermediate", description: "Compound chest exercise" },
  { id: "2", name: "Incline Dumbbell Press", muscleGroup: "Chest", equipment: "Dumbbells", difficulty: "intermediate", description: "Upper chest focus" },
  { id: "3", name: "Cable Flyes", muscleGroup: "Chest", equipment: "Cable Machine", difficulty: "beginner", description: "Chest isolation movement" },
  { id: "4", name: "Push-ups", muscleGroup: "Chest", equipment: "Bodyweight", difficulty: "beginner", description: "Classic bodyweight exercise" },
  { id: "5", name: "Pull-ups", muscleGroup: "Back", equipment: "Pull-up Bar", difficulty: "intermediate", description: "Lat-focused compound movement" },
  { id: "6", name: "Barbell Rows", muscleGroup: "Back", equipment: "Barbell", difficulty: "intermediate", description: "Horizontal pulling movement" },
  { id: "7", name: "Lat Pulldowns", muscleGroup: "Back", equipment: "Cable Machine", difficulty: "beginner", description: "Machine lat exercise" },
  { id: "8", name: "Seated Cable Rows", muscleGroup: "Back", equipment: "Cable Machine", difficulty: "beginner", description: "Back thickness builder" },
  { id: "9", name: "Deadlift", muscleGroup: "Back", equipment: "Barbell", difficulty: "advanced", description: "Full posterior chain" },
  { id: "10", name: "Overhead Press", muscleGroup: "Shoulders", equipment: "Barbell", difficulty: "intermediate", description: "Compound shoulder press" },
  { id: "11", name: "Lateral Raises", muscleGroup: "Shoulders", equipment: "Dumbbells", difficulty: "beginner", description: "Side delt isolation" },
  { id: "12", name: "Face Pulls", muscleGroup: "Shoulders", equipment: "Cable Machine", difficulty: "beginner", description: "Rear delt and rotator cuff" },
  { id: "13", name: "Barbell Curl", muscleGroup: "Arms", equipment: "Barbell", difficulty: "beginner", description: "Bicep builder" },
  { id: "14", name: "Tricep Pushdowns", muscleGroup: "Arms", equipment: "Cable Machine", difficulty: "beginner", description: "Tricep isolation" },
  { id: "15", name: "Hammer Curls", muscleGroup: "Arms", equipment: "Dumbbells", difficulty: "beginner", description: "Brachialis focus" },
  { id: "16", name: "Barbell Back Squat", muscleGroup: "Legs", equipment: "Barbell", difficulty: "intermediate", description: "King of leg exercises" },
  { id: "17", name: "Romanian Deadlift", muscleGroup: "Legs", equipment: "Barbell", difficulty: "intermediate", description: "Hamstring focus" },
  { id: "18", name: "Leg Press", muscleGroup: "Legs", equipment: "Machine", difficulty: "beginner", description: "Quad-focused machine" },
  { id: "19", name: "Leg Curls", muscleGroup: "Legs", equipment: "Machine", difficulty: "beginner", description: "Hamstring isolation" },
  { id: "20", name: "Calf Raises", muscleGroup: "Legs", equipment: "Machine", difficulty: "beginner", description: "Calf development" },
  { id: "21", name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", difficulty: "beginner", description: "Core stability" },
  { id: "22", name: "Cable Crunches", muscleGroup: "Core", equipment: "Cable Machine", difficulty: "beginner", description: "Weighted ab exercise" },
  { id: "23", name: "Hanging Leg Raises", muscleGroup: "Core", equipment: "Pull-up Bar", difficulty: "intermediate", description: "Lower ab focus" },
];

// Map specific muscles to broader categories
const muscleToCategory: Record<string, string> = {
  // Chest
  "chest": "Chest", "pectorals": "Chest", "pecs": "Chest", "upper chest": "Chest", "lower chest": "Chest",
  // Back
  "back": "Back", "lats": "Back", "latissimus dorsi": "Back", "rhomboids": "Back", "traps": "Back", "trapezius": "Back", "lower back": "Back", "erector spinae": "Back", "rear delts": "Back", "upper back": "Back", "mid back": "Back",
  // Shoulders
  "shoulders": "Shoulders", "delts": "Shoulders", "deltoids": "Shoulders", "front delts": "Shoulders", "side delts": "Shoulders", "lateral delts": "Shoulders", "anterior deltoid": "Shoulders", "posterior deltoid": "Shoulders", "rotator cuff": "Shoulders",
  // Arms
  "arms": "Arms", "biceps": "Arms", "triceps": "Arms", "forearms": "Arms", "brachialis": "Arms", "bicep": "Arms", "tricep": "Arms", "forearm": "Arms", "wrists": "Arms",
  // Legs
  "legs": "Legs", "quads": "Legs", "quadriceps": "Legs", "hamstrings": "Legs", "glutes": "Legs", "gluteus": "Legs", "calves": "Legs", "calf": "Legs", "hip flexors": "Legs", "adductors": "Legs", "abductors": "Legs", "thighs": "Legs", "lower body": "Legs",
  // Core
  "core": "Core", "abs": "Core", "abdominals": "Core", "obliques": "Core", "lower abs": "Core", "upper abs": "Core", "transverse abdominis": "Core", "hip": "Core", "pelvis": "Core",
  // Full Body
  "full body": "Full Body", "compound": "Full Body", "total body": "Full Body", "whole body": "Full Body",
  // Cardio
  "cardio": "Cardio", "cardiovascular": "Cardio", "heart": "Cardio", "conditioning": "Cardio", "endurance": "Cardio",
};

// Function to get category from muscle name
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

export default function ProgramBuilderPage() {
  const router = useRouter();
  const [programName, setProgramName] = useState("");
  const [programDescription, setProgramDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>("free");
  const [price, setPrice] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"templates" | "exercises">("templates");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Exercises State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [savedTemplates, setSavedTemplates] = useState<WorkoutTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateFetchError, setTemplateFetchError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  
  // Modal State
  const [selectedWorkout, setSelectedWorkout] = useState<SelectedWorkout | null>(null);
  const [phaseDescriptionModalPhase, setPhaseDescriptionModalPhase] = useState<Phase | null>(null);
  const [phaseDescriptionDraft, setPhaseDescriptionDraft] = useState("");
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState(false);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [savingTemplateName, setSavingTemplateName] = useState(false);
  const [phaseMenuOpenId, setPhaseMenuOpenId] = useState<string | null>(null);
  const [phasePendingDelete, setPhasePendingDelete] = useState<Phase | null>(null);
  const phaseHeaderMenuRef = useRef<HTMLDivElement | null>(null);

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
  }, [phaseMenuOpenId]);

  // Fetch exercises from Firebase on mount
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        const exercisesCollection = collection(db, "exercises");
        const exercisesSnapshot = await getDocs(exercisesCollection);
        
        if (!exercisesSnapshot.empty) {
          const fetchedExercises: Exercise[] = exercisesSnapshot.docs.map((doc) => {
            const data = doc.data();
            let rawMuscle = data.muscleGroup || 
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
            else if (rawMuscle && typeof rawMuscle === 'object') {
              const muscleObj = rawMuscle as any;
              rawMuscle = muscleObj.name || muscleObj.title || muscleObj.slug || "";
            }
            
            return {
              id: doc.id,
              name: data.name || "Unnamed Exercise",
              muscleGroup: getCategoryFromMuscle(String(rawMuscle)),
              musclesInvolved: Array.isArray(data.musclesInvolved) ? data.musclesInvolved : (Array.isArray(data.primaryMuscles) ? data.primaryMuscles : []),
              equipment: data.equipment || "None",
              difficulty: data.difficulty || "intermediate",
              description: data.description,
              instructions: data.instructions,
              videoUrl: data.videoUrl,
            };
          });
          setExercises(fetchedExercises.length > 0 ? fetchedExercises : mockExercises);
        } else {
            setExercises(mockExercises);
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setExercises(mockExercises);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, []);

  // Fetch workout templates from Firestore (reusable for refetch after save)
  const fetchWorkoutTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      setTemplateFetchError(null);

      const workoutsSnapshot = await getDocs(collection(db, "workouts"));
      if (workoutsSnapshot.empty) {
        setSavedTemplates([]);
        return;
      }

      const fetchedTemplates: WorkoutTemplate[] = workoutsSnapshot.docs.map((workoutDoc) => {
        const data = workoutDoc.data() as Record<string, unknown>;
        const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];
        const exercisesCount = rawExercises.length;
        const mappedTemplateExercises: WorkoutTemplateExercise[] = rawExercises.map((exercise) => {
          const exerciseData = (exercise && typeof exercise === "object" ? exercise : {}) as Record<string, unknown>;
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
            restPeriod: typeof exerciseData.restPeriod === "string" ? exerciseData.restPeriod : undefined,
            notes:
              typeof exerciseData.notes === "string" || exerciseData.notes === null
                ? (exerciseData.notes as string | null)
                : undefined,
          };
        });
        const estimatedDuration =
          typeof data.estimatedDuration === "number" && Number.isFinite(data.estimatedDuration)
            ? data.estimatedDuration
            : exercisesCount * 5;

        return {
          id: workoutDoc.id,
          name:
            typeof data.name === "string" && data.name.trim()
              ? data.name.trim()
              : "Untitled Workout",
          exercises: exercisesCount,
          duration: estimatedDuration,
          category: "saved",
          description: typeof data.description === "string" ? data.description : "",
          tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
          templateExercises: mappedTemplateExercises,
        };
      });

      setSavedTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Error fetching workout templates:", error);
      setTemplateFetchError("Failed to load saved templates.");
      setSavedTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkoutTemplates();
  }, [fetchWorkoutTemplates]);

  // Group exercises by muscle group
  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    muscleGroupOrder.forEach(group => { groups[group] = []; });
    
    // Filter exercises if search query exists and tab is exercises
    // Note: We use the same search query for both tabs, which is fine
    const filtered = (sidebarTab === "exercises" && searchQuery.trim())
      ? exercises.filter(ex => 
          ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : exercises;
    
    filtered.forEach(exercise => {
      const group = muscleGroupOrder.includes(exercise.muscleGroup) ? exercise.muscleGroup : "Other";
      groups[group].push(exercise);
    });
    
    return groups;
  }, [exercises, searchQuery, sidebarTab]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchQuery.trim() && sidebarTab === "exercises") {
      // Expand all groups that have matching exercises
      const groupsWithMatches = new Set<string>();
      Object.entries(groupedExercises).forEach(([group, exs]) => {
        if (exs.length > 0) {
          groupsWithMatches.add(group);
        }
      });
      setExpandedGroups(groupsWithMatches);
    }
  }, [searchQuery, groupedExercises, sidebarTab]);


  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  
  const handleDragStart = (e: React.DragEvent, template: WorkoutTemplate) => {
    e.dataTransfer.setData("template", JSON.stringify(template));
  };

  const openTemplateModal = (template: WorkoutTemplate) => {
    setSelectedTemplate(template);
    setTemplateNameDraft(template.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, phaseId: string, dayIndex: number) => {
    e.preventDefault();
    const templateData = e.dataTransfer.getData("template");
    
    if (templateData) {
      const template = JSON.parse(templateData) as WorkoutTemplate;
      const droppedExercises: ModalExercise[] = Array.isArray(template.templateExercises)
        ? template.templateExercises.map((exercise, index) => {
            const exerciseId = exercise.exerciseId || `${template.id}-exercise-${index + 1}`;
            const fromLibrary = exercises.find((e) => e.id === exerciseId);
            return {
              id: exerciseId,
              name: exercise.exerciseName,
              muscleGroup: fromLibrary?.muscleGroup || "",
              musclesInvolved: fromLibrary?.musclesInvolved || [],
              equipment: fromLibrary?.equipment || "Unknown",
              difficulty: fromLibrary?.difficulty || "intermediate",
              sets: exercise.targetSets ?? 3,
              repsRange: exercise.targetReps ?? "8-12",
            };
          })
        : [];

      setPhases((prevPhases) =>
        prevPhases.map((p) => {
          if (p.id === phaseId) {
            const newDays = [...p.days];
            newDays[dayIndex] = {
              type: "workout",
              workoutName: template.name,
              duration: template.duration,
              label: `Workout ${String.fromCharCode(65 + (dayIndex % 7))}`, // A, B, C based on day index
              exercises: droppedExercises,
            };
            return { ...p, days: newDays };
          }
          return p;
        })
      );
    }
  };

  // Modal Handlers
  const openWorkoutModal = (phaseId: string, dayIndex: number, workout: PhaseDay) => {
    setSelectedWorkout({ phaseId, dayIndex, workout });
  };

  const handleWorkoutModalClose = (result: {
    workoutName: string;
    exercises: ModalExercise[];
  }) => {
    if (selectedWorkout) {
      setPhases((prevPhases) =>
        prevPhases.map((p) => {
          if (p.id === selectedWorkout.phaseId) {
            const newDays = [...p.days];
            const currentDay = newDays[selectedWorkout.dayIndex];

            if (currentDay.type === "empty" && result.exercises.length > 0) {
              newDays[selectedWorkout.dayIndex] = {
                type: "workout",
                workoutName: result.workoutName || "New Workout",
                duration: result.exercises.length * 5,
                exercises: result.exercises,
              };
            } else if (currentDay.type === "workout") {
              newDays[selectedWorkout.dayIndex] = {
                ...currentDay,
                workoutName: result.workoutName,
                exercises: result.exercises,
              };
            }

            return { ...p, days: newDays };
          }
          return p;
        })
      );
    }
    setSelectedWorkout(null);
  };

  const clearDay = (phaseId: string, dayIndex: number) => {
    setPhases(phases.map(p => {
      if (p.id === phaseId) {
        const newDays = [...p.days];
        newDays[dayIndex] = { type: "empty" };
        return { ...p, days: newDays };
      }
      return p;
    }));
  };

  const setRestDay = (phaseId: string, dayIndex: number) => {
    setPhases(phases.map(p => {
      if (p.id === phaseId) {
        const newDays = [...p.days];
        newDays[dayIndex] = { type: "rest" };
        return { ...p, days: newDays };
      }
      return p;
    }));
  };

  const [phases, setPhases] = useState<Phase[]>([
    {
      id: "1",
      name: "Phase 1",
      description: "Define the focus for this phase",
      weeks: "1-2",
      isExpanded: true,
      durationWeeks: 2,
      days: [
        { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
        // Week 2
        { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }
      ],
    },
  ]);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROGRAM_BUILDER_DRAFT_KEY);
      if (!stored) return;
      const draft = JSON.parse(stored) as {
        programName?: string;
        programDescription?: string;
        accessType?: AccessType;
        price?: number | null;
        phases?: Phase[];
      };
      if (draft.programName != null) {
        setProgramName(
          draft.programName === "Name your program" ? "" : draft.programName
        );
      }
      if (draft.programDescription != null) setProgramDescription(draft.programDescription);
      if (draft.accessType != null) setAccessType(draft.accessType);
      if (draft.price !== undefined) setPrice(draft.price);
      if (Array.isArray(draft.phases) && draft.phases.length > 0) setPhases(draft.phases);
    } catch {
      // Invalid or corrupt data, ignore
    }
  }, []);

  // Debounced save to localStorage when state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = {
        programName,
        programDescription,
        accessType,
        price,
        phases,
      };
      localStorage.setItem(PROGRAM_BUILDER_DRAFT_KEY, JSON.stringify(draft));
    }, 500);
    return () => clearTimeout(timer);
  }, [programName, programDescription, accessType, price, phases]);

  const togglePhase = (phaseId: string) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId ? { ...phase, isExpanded: !phase.isExpanded } : phase
    ));
  };
  
  const updatePhaseDuration = (phaseId: string, duration: number) => {
    setPhases(phases.map(p => {
      if (p.id !== phaseId) return p;
      
      const currentDaysCount = p.days.length;
      const targetDaysCount = duration * 7;
      
      let newDays = [...p.days];
      
      if (targetDaysCount > currentDaysCount) {
        // Add more days
        const daysToAdd = targetDaysCount - currentDaysCount;
        const emptyDays = Array(daysToAdd).fill({ type: "empty" });
        newDays = [...newDays, ...emptyDays];
      } else if (targetDaysCount < currentDaysCount) {
        // Remove days
        newDays = newDays.slice(0, targetDaysCount);
      }
      
      return { ...p, durationWeeks: duration, days: newDays };
    }));
  };

  const updatePhaseName = (phaseId: string, name: string) => {
    setPhases(phases.map(p => p.id === phaseId ? { ...p, name } : p));
  };

  const updatePhaseDescription = (phaseId: string, description: string) => {
    setPhases(phases.map(p => p.id === phaseId ? { ...p, description } : p));
  };

  const addPhase = () => {
    const newPhase: Phase = {
      id: `${phases.length + 1}`,
      name: `Phase ${phases.length + 1}`,
      description: "Define the focus for this phase",
      weeks: `${phases.length + 1}`,
      isExpanded: true,
      durationWeeks: 1,
      days: Array(1 * 7).fill({ type: "empty" }),
    };
    setPhases([...phases, newPhase]);
  };

  const handleClear = () => {
    setProgramName("");
    setProgramDescription("");
    setAccessType("free");
    setPrice(null);
    setPhases([
      {
        id: "1",
        name: "Phase 1",
        description: "Define the focus for this phase",
        weeks: "1-2",
        isExpanded: true,
        durationWeeks: 2,
        days: [
          { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" },
          { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }, { type: "empty" }
        ],
      },
    ]);
    localStorage.removeItem(PROGRAM_BUILDER_DRAFT_KEY);
  };

  const handleSaveProgram = async () => {
    if (isSaving) return;
    const trimmedName = programName.trim();
    if (!trimmedName) {
      alert("Please enter a program title before saving.");
      return;
    }
    if (accessType === "paid" && (price === null || price < 0)) {
      alert("Please enter a valid price for paid programs.");
      return;
    }
    setIsSaving(true);

    try {
      const programData = {
        name: trimmedName,
        description: programDescription.trim() || "",
        totalDuration: phases.reduce((acc, phase) => acc + phase.durationWeeks, 0),
        daysPerWeek: 7,
        difficulty: "intermediate",
        coverImage: "",
        createdBy: "coach",
        createdAt: serverTimestamp(),
        isActive: true,
        accessType,
        price: accessType === "paid" ? (price ?? 0) : null,
        assignedTo: [],
        phases: phases.map((phase, phaseIndex) => ({
          phaseId: phase.id,
          name: phase.name,
          description: phase.description,
          order: phaseIndex,
          durationWeeks: phase.durationWeeks,
          focusAreas: [],
          workouts: phase.days.map((day, dayIndex) => ({
            dayNumber: dayIndex + 1,
            weekNumber: Math.floor(dayIndex / 7) + 1,
            isRestDay: day.type === "rest",
            workoutId: day.type === "workout" ? `workout_${phaseIndex}_${dayIndex}` : null,
            workoutName: day.type === "workout" ? (day.workoutName || "Unnamed Workout") : null,
            description: "",
            estimatedDuration: day.duration || 0,
            exercises: (day.exercises || []).map((exercise, exIndex) => ({
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              order: exIndex,
              sets: exercise.sets || 3,
              repsRange: exercise.repsRange || "8-12",
              restPeriod: "60s",
              notes: null,
              musclesInvolved: exercise.musclesInvolved || [],
            })),
          })),
        })),
      };

      await addDoc(collection(db, "programs"), programData);
      localStorage.removeItem(PROGRAM_BUILDER_DRAFT_KEY);
      router.push("/programs");
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const allTemplates = [...savedTemplates, ...mockTemplates];

  const filteredTemplates = allTemplates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const savedTemplateResults = filteredTemplates.filter(t => t.category === "saved");
  const recentTemplates = filteredTemplates.filter(t => t.category === "recent");
  const strengthTemplates = filteredTemplates.filter(t => t.category === "strength");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
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
            
            {/* Segmented Control */}
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
            {sidebarTab === "templates" ? (
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
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Saved Workouts</div>
                    {savedTemplateResults.map((template) => (
                  <div
                    key={template.id}
                    className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    onClick={() => openTemplateModal(template)}
                  >
                        <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
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
                    ))}
                  </>
                )}

                {!loadingTemplates && !searchQuery.trim() && savedTemplates.length === 0 && !templateFetchError && (
                  <div className="text-center py-3 text-muted-foreground text-xs">
                    No saved templates yet.
                  </div>
                )}

                {recentTemplates.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Recent</div>
                    {recentTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    onClick={() => openTemplateModal(template)}
                  >
                        <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
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
                    ))}
                  </>
                )}
                
                {strengthTemplates.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-4">Strength</div>
                    {strengthTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    onClick={() => openTemplateModal(template)}
                  >
                        <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
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
                    ))}
                  </>
                )}
                
                {!loadingTemplates && recentTemplates.length === 0 && strengthTemplates.length === 0 && savedTemplateResults.length === 0 && (
                   <div className="text-center py-8 text-muted-foreground text-sm">
                     No templates found matching "{searchQuery}"
                   </div>
                )}
              </>
            ) : (
              // Exercises View
              <div className="space-y-1">
                {loadingExercises ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Loading exercises...
                  </div>
                ) : (
                  muscleGroupOrder.map((group) => {
                    const groupExercises = groupedExercises[group];
                    if (groupExercises.length === 0) return null;
                    const isExpanded = expandedGroups.has(group);
                    
                    return (
                      <div key={group} className="border border-border rounded-lg overflow-hidden bg-card">
                        <button
                          onClick={() => toggleGroup(group)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-semibold text-card-foreground uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                             {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
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
                                className="group flex items-center gap-2 px-3 py-2 hover:bg-muted/30"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-card-foreground truncate">{exercise.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{exercise.equipment} • {exercise.difficulty}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                
                {!loadingExercises && Object.values(groupedExercises).every(g => g.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No exercises found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" />
              Create New Template
            </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto bg-background scroll-smooth">

          <div className="mx-auto max-w-[1600px] p-4 flex flex-col gap-4 pb-32 ">
            <Link
              href="/programs"
              className="inline-flex self-start items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Programs
            </Link>
            <div className="flex flex-col xl:flex-row xl:items-start gap-8">
              <div className="flex-1 min-w-0 flex flex-col gap-8">
            {/* Phases */}
            {phases.map((phase) => (
              /* Phase card */
              <div key={phase.id} className="flex flex-col bg-card shadow-sm border border-border ">
                {/* Phase Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2 gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <button 
                      onClick={() => togglePhase(phase.id)}
                      className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${phase.isExpanded ? "" : "-rotate-90"}`} />
                    </button>
                    <div className="flex flex-row items-center gap-3 min-w-0 flex-1">
                      <input
                        type="text"
                        value={phase.name}
                        onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                        className="text-base font-bold text-card-foreground bg-transparent border-none p-0 focus:ring-0 shrink-0 w-auto min-w-[6rem] max-w-[40%]"
                        placeholder="Phase Name"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPhaseDescriptionModalPhase(phase);
                          setPhaseDescriptionDraft(phase.description || "");
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground text-left flex items-center gap-2 py-1 rounded hover:bg-muted/50 transition-colors min-w-0 flex-1 justify-start"
                      >
                        <Edit className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {phase.description?.trim()
                            ? phase.description.trim()
                            : "Add phase description"}
                        </span>
                      </button>
                    </div>
                  </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <select
                          value={phase.durationWeeks}
                          onChange={(e) => updatePhaseDuration(phase.id, parseInt(e.target.value))}
                          className="bg-transparent text-sm font-medium text-card-foreground border-none focus:ring-0 p-0 cursor-pointer"
                        >
                          {[1, 2, 3, 4, 5, 6].map(num => (
                            <option key={num} value={num}>{num} Weeks</option>
                          ))}
                        </select>
                      </div>
                      <div
                        className="relative"
                        ref={phaseMenuOpenId === phase.id ? phaseHeaderMenuRef : undefined}
                      >
                        <button
                          type="button"
                          aria-expanded={phaseMenuOpenId === phase.id}
                          aria-haspopup="menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhaseMenuOpenId((id) => (id === phase.id ? null : phase.id));
                          }}
                          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {phaseMenuOpenId === phase.id && (
                          <div
                            role="menu"
                            className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-border bg-card py-1 shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              disabled={phases.length <= 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhaseMenuOpenId(null);
                                if (phases.length <= 1) {
                                  alert("A program must have at least one phase.");
                                  return;
                                }
                                setPhasePendingDelete(phase);
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

                {/* Weekly Grid */}
                {phase.isExpanded && (
                  <>
                    <div className="p-6">
                      <div className="grid grid-cols-7 gap-4 min-w-[800px]">
                        {/* Column Headers */}
                        {dayNames.map((day) => (
                          <div key={day} className="text-center">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{day}</span>
                          </div>
                        ))}

                        {/* Days */}
                        {phase.days.map((day, idx) => (
                          <div 
                            key={idx} 
                            className="flex flex-col gap-2"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, phase.id, idx)}
                          >
                            {day.type === "workout" ? (
                              <div 
                                className="group relative flex flex-col gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 hover:shadow-md transition-shadow cursor-pointer h-full"
                                onClick={() => openWorkoutModal(phase.id, idx, day)}
                              >
                                <div className="flex justify-end">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); clearDay(phase.id, idx); }}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-sm font-semibold text-card-foreground leading-tight">{day.workoutName}</p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-auto">
                                  {day.exercises && day.exercises.length > 0 && (
                                    <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                      {day.exercises.length} exercises
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : day.type === "rest" ? (
                              <div className="group relative flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground hover:border-amber-400 transition-colors">
                                <button 
                                  onClick={() => clearDay(phase.id, idx)}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                  title="Remove rest day"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <Hotel className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Rest Day</span>
                              </div>
                            ) : (
                              <div 
                                className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group bg-card relative"
                                onClick={() => openWorkoutModal(phase.id, idx, { type: "empty" })}
                              >
                                <div className="size-8 rounded-full bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-card flex items-center justify-center mb-2 transition-colors">
                                  <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Add Workout</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRestDay(phase.id, idx); }}
                                  className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 px-2 py-1 text-[10px] font-medium rounded bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 text-muted-foreground hover:text-amber-700 dark:hover:text-amber-400 transition-all flex items-center gap-1"
                                >
                                  <Hotel className="w-3 h-3" />
                                  Rest Day
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Phase Footer */}
                    <div className="bg-muted/50 px-6 py-3 border-t border-border flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Total Workouts: {phase.days.filter(d => d.type === "workout").length}</span>

                      </div>
                      <button className="text-xs font-medium text-primary hover:underline">Copy week to next week</button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add Phase Button */}
            <button 
              onClick={addPhase}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-transparent py-6 transition-all hover:border-primary hover:bg-card hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add New Phase</span>
            </button>
              </div>

              {/* Program title / details — right column on wide screens */}
              <aside className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-8 xl:self-start">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shadow-lg text-white">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
              <div className="relative z-10 flex flex-col gap-2">
                {/* Top block: Program Title + Duration/Access */}
                <div className="flex flex-col gap-6">
                  <div className="flex-1 min-w-0">
                    <label className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Program Title</label>
                    <input 
                      type="text"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      className="w-full bg-transparent border-none text-3xl xl:text-4xl font-bold text-white placeholder-blue-200 focus:ring-0 px-0 leading-tight focus:outline-none"
                      placeholder="Name your program"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 shrink-0">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Duration</span>
                      <span className="font-medium">{phases.reduce((acc, phase) => acc + phase.durationWeeks, 0)} Weeks</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col gap-2 min-w-0 flex-1 basis-[200px]">
                      <span className="text-xs text-blue-100 font-semibold uppercase tracking-wider">Access Type</span>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="accessType"
                            value="free"
                            checked={accessType === "free"}
                            onChange={() => { setAccessType("free"); setPrice(null); }}
                            className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                          />
                          <span className="text-sm font-medium">Free</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="accessType"
                            value="assigned"
                            checked={accessType === "assigned"}
                            onChange={() => { setAccessType("assigned"); setPrice(null); }}
                            className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                          />
                          <span className="text-sm font-medium">Custom</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="accessType"
                            value="paid"
                            checked={accessType === "paid"}
                            onChange={() => setAccessType("paid")}
                            className="rounded-full border-white/40 text-blue-600 focus:ring-white/50"
                          />
                          <span className="text-sm font-medium">Paid</span>
                        </label>
                      </div>
                      {accessType === "paid" && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-100">Price ($)</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={price ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPrice(val === "" ? null : Math.max(0, parseFloat(val) || 0));
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
                  <label className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Program Description</label>
                  <textarea
                    value={programDescription}
                    onChange={(e) => setProgramDescription(e.target.value)}
                    rows={8}
                    className="w-full mt-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 resize-y min-h-[120px]"
                    placeholder="Describe your program (goals, focus areas, who it's for...)"
                  />
                </div>
                <div className="flex gap-2">
                  {/* <button className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Details
                  </button> */}
                </div>
              </div>
            </div>
              </aside>
            </div>
          </div>
        </main>

        {/* Fixed Footer / Action Bar */}
        <div className="absolute bottom-0 right-0 left-0 md:left-[280px] bg-card/90 backdrop-blur-md border-t border-border px-8 py-4 z-20">
          <div className="flex items-center justify-between mx-auto max-w-[1280px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">

            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleClear}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Clear
              </button>
              <div className="flex-1" />
              <button 
                onClick={handleSaveProgram}
                disabled={isSaving || !programName.trim()}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* Workout Editor Modal */}
        {selectedWorkout && (
          <WorkoutEditorModal
            isOpen={true}
            workoutName={selectedWorkout.workout.workoutName || "New Workout"}
            exercises={(selectedWorkout.workout.exercises || []) as ModalExercise[]}
            groupedExercises={groupedExercises as Record<string, ModalExercise[]>}
            muscleGroupOrder={muscleGroupOrder}
            loadingExercises={loadingExercises}
            onClose={handleWorkoutModalClose}
            onTemplateSaved={fetchWorkoutTemplates}
          />
        )}

        {/* Workout Template Preview Modal */}
        {selectedTemplate && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
              <div className="flex items-start justify-between border-b border-border px-6 py-4">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Workout Template</p>
                  {selectedTemplate.category === "saved" ? (
                    <input
                      type="text"
                      value={templateNameDraft}
                      onChange={(e) => setTemplateNameDraft(e.target.value)}
                      className="mt-1 w-full text-xl font-bold text-card-foreground bg-transparent border-b-2 border-transparent hover:border-border focus:border-primary focus:outline-none px-0 py-1 transition-colors"
                      placeholder="Workout name"
                    />
                  ) : (
                    <h3 className="mt-1 text-xl font-bold text-card-foreground">{selectedTemplate.name}</h3>
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
                  onClick={() => { setSelectedTemplate(null); setShowDeleteTemplateConfirm(false); }}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close template preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                {selectedTemplate.description && selectedTemplate.description.trim() ? (
                  <p className="mb-4 text-sm text-muted-foreground">{selectedTemplate.description}</p>
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

                {selectedTemplate.templateExercises && selectedTemplate.templateExercises.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTemplate.templateExercises.map((exercise, index) => (
                      <div
                        key={`${selectedTemplate.id}-${exercise.exerciseName}-${index}`}
                        className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-card-foreground">
                          {index + 1}. {exercise.exerciseName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {exercise.targetSets ?? "-"} sets • {exercise.targetReps || "-"} reps
                          {exercise.restPeriod ? ` • rest ${exercise.restPeriod}` : ""}
                        </p>
                      </div>
                    ))}
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
                              await updateDoc(doc(db, "workouts", selectedTemplate.id), {
                                name: templateNameDraft.trim(),
                              });
                              setSelectedTemplate((prev) => prev ? { ...prev, name: templateNameDraft.trim() } : null);
                              fetchWorkoutTemplates();
                            } catch (err) {
                              console.error("Error updating workout name:", err);
                              alert("Failed to update workout name. Please try again.");
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
                  onClick={() => { setSelectedTemplate(null); setShowDeleteTemplateConfirm(false); }}
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
                fetchWorkoutTemplates();
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
                  Are you sure you want to delete <span className="font-semibold text-card-foreground">{selectedTemplate.name}</span>?
                </p>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </>
            }
            confirmLabel="Delete Workout"
          />
        )}

        <ConfirmModal
          isOpen={!!phasePendingDelete}
          onClose={() => setPhasePendingDelete(null)}
          onConfirm={async () => {
            const p = phasePendingDelete;
            if (!p) return;
            setPhases((prev) => prev.filter((x) => x.id !== p.id));
          }}
          title="Delete phase"
          message={
            phasePendingDelete ? (
              <>
                <p className="mb-1">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-card-foreground">
                    {phasePendingDelete.name.trim() || "this phase"}
                  </span>
                  ?
                </p>
                <p className="text-xs text-muted-foreground">This cannot be undone.</p>
              </>
            ) : null
          }
          confirmLabel="Delete phase"
        />

        <PhaseDescriptionModal
          isOpen={!!phaseDescriptionModalPhase}
          onClose={() => setPhaseDescriptionModalPhase(null)}
          title={phaseDescriptionModalPhase ? `Phase Description — ${phaseDescriptionModalPhase.name}` : ""}
          subtitle="Describe the focus and goals for this phase"
          value={phaseDescriptionDraft}
          onChange={setPhaseDescriptionDraft}
          onSave={() => {
            if (phaseDescriptionModalPhase) {
              updatePhaseDescription(phaseDescriptionModalPhase.id, phaseDescriptionDraft);
              setPhaseDescriptionModalPhase(null);
            }
          }}
          placeholder="Define the focus for this phase..."
        />
      </div>
    </div>
  );
}
