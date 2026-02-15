"use client";

import { useState } from "react";
import { 
  Search, 
  GripVertical, 
  Info, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  X, 
  Clock, 
  Hotel,
  Edit,
  MoreHorizontal,
  CheckCircle,
  Send,
  Dumbbell,
  LayoutDashboard,
  Users,
  Calendar,
  Library,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mock template data
const mockTemplates = [
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
  exercises?: Exercise[];
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
  const [programName, setProgramName] = useState("Name your program");
  const [isSaving, setIsSaving] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"templates" | "exercises">("templates");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Exercises State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Modal State
  const [selectedWorkout, setSelectedWorkout] = useState<SelectedWorkout | null>(null);
  const [modalExercises, setModalExercises] = useState<Exercise[]>([]);
  const [draggedExerciseIndex, setDraggedExerciseIndex] = useState<number | null>(null);
  const [modalExpandedGroups, setModalExpandedGroups] = useState<Set<string>>(new Set());
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalWorkoutName, setModalWorkoutName] = useState("");

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

  // Auto-expand modal groups when searching in modal
  useEffect(() => {
    if (modalSearchQuery.trim()) {
      // Expand all groups that have matching exercises
      const groupsWithMatches = new Set<string>();
      Object.entries(groupedExercises).forEach(([group, exs]) => {
        const hasMatch = exs.some(ex =>
          ex.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
          ex.equipment.toLowerCase().includes(modalSearchQuery.toLowerCase())
        );
        if (hasMatch) {
          groupsWithMatches.add(group);
        }
      });
      setModalExpandedGroups(groupsWithMatches);
    }
  }, [modalSearchQuery, groupedExercises]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  
  const handleDragStart = (e: React.DragEvent, template: any) => {
    e.dataTransfer.setData("template", JSON.stringify(template));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, phaseId: string, dayIndex: number) => {
    e.preventDefault();
    const templateData = e.dataTransfer.getData("template");
    
    if (templateData) {
      const template = JSON.parse(templateData);
      setPhases(phases.map(p => {
        if (p.id === phaseId) {
          const newDays = [...p.days];
          newDays[dayIndex] = {
            type: "workout",
            workoutName: template.name,
            duration: template.duration,
            label: `Workout ${String.fromCharCode(65 + (dayIndex % 7))}`, // A, B, C based on day index
            exercises: [] // Initialize empty exercises array
          };
          return { ...p, days: newDays };
        }
        return p;
      }));
    }
  };

  // Modal Handlers
  const openWorkoutModal = (phaseId: string, dayIndex: number, workout: PhaseDay) => {
    setSelectedWorkout({ phaseId, dayIndex, workout });
    setModalExercises(workout.exercises || []);
    setModalWorkoutName(workout.workoutName || "New Workout");
  };

  const closeWorkoutModal = () => {
    if (selectedWorkout) {
      // Save exercises back to phase
      setPhases(phases.map(p => {
        if (p.id === selectedWorkout.phaseId) {
          const newDays = [...p.days];
          const currentDay = newDays[selectedWorkout.dayIndex];
          
          // If this was an empty day and exercises were added, convert to workout
          if (currentDay.type === "empty" && modalExercises.length > 0) {
            newDays[selectedWorkout.dayIndex] = {
              type: "workout",
              workoutName: modalWorkoutName || "New Workout",
              duration: modalExercises.length * 5, // Estimate 5 min per exercise
              exercises: modalExercises
            };
          } else if (currentDay.type === "workout") {
            // Update existing workout
            newDays[selectedWorkout.dayIndex] = {
              ...currentDay,
              workoutName: modalWorkoutName,
              exercises: modalExercises
            };
          }
          return { ...p, days: newDays };
        }
        return p;
      }));
    }
    setSelectedWorkout(null);
    setModalExercises([]);
    setModalExpandedGroups(new Set());
    setModalSearchQuery("");
    setModalWorkoutName("");
  };

  const addExerciseToWorkout = (exercise: Exercise) => {
    setModalExercises(prev => [...prev, { ...exercise, sets: exercise.sets || 3, repsRange: exercise.repsRange || "8-12" }]);
  };

  const updateExerciseInWorkout = (index: number, field: keyof Exercise, value: any) => {
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

  const handleSaveProgram = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const programData = {
        name: programName,
        description: phases[0]?.description || "",
        totalDuration: phases.reduce((acc, phase) => acc + phase.durationWeeks, 0),
        daysPerWeek: 7,
        difficulty: "intermediate",
        coverImage: "",
        createdBy: "coach",
        createdAt: serverTimestamp(),
        isActive: true,
        phases: phases.map((phase, phaseIndex) => ({
          phaseId: phase.id,
          name: phase.name,
          description: phase.description,
          order: phaseIndex,
          durationWeeks: phase.durationWeeks,
          focusAreas: [],
          workouts: phase.days.map((day, dayIndex) => ({
            dayNumber: dayIndex + 1,
            dayName: dayNames[dayIndex % 7],
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
              tempo: "",
              restPeriod: "60s",
              notes: null,
              isSuperset: false,
              supersetGroup: "",
            })),
          })),
        })),
      };

      await addDoc(collection(db, "programs"), programData);
      router.push("/programs");
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTemplates = mockTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentTemplates = filteredTemplates.filter(t => t.category === "recent");
  const strengthTemplates = filteredTemplates.filter(t => t.category === "strength");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <header className="flex shrink-0 items-center justify-between whitespace-nowrap border-b border-border bg-card px-6 py-3 z-20">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-card-foreground text-sm leading-tight">BeShaped Fitness</h1>
              <span className="text-[10px] text-muted-foreground">Coach Portal</span>
            </div>
          </Link>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Nav Links */}
          <nav className="flex items-center gap-1">
            {[
              { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/" },
              { icon: <Users size={18} />, label: "Clients", href: "/clients" },
              { icon: <Calendar size={18} />, label: "Programs", href: "/programs" },
              { icon: <Library size={18} />, label: "Exercises", href: "/exercises" },
            ].map((item) => {
              const isActive = item.href === "/programs";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Settings */}
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Settings size={18} />
            <span className="hidden md:inline">Settings</span>
          </Link>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white text-xs font-medium">D</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-card-foreground leading-tight">Dewald</p>
              <p className="text-[10px] text-muted-foreground">Head Coach</p>
            </div>
          </div>
        </div>
      </header>

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
                {recentTemplates.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Recent</div>
                    {recentTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                  >
                        <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
                        </div>
                        <button className="text-muted-foreground hover:text-foreground">
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
                  >
                        <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
                        </div>
                        <button className="text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
                
                {recentTemplates.length === 0 && strengthTemplates.length === 0 && (
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
          <Link
              href="/programs"
              className=" hover:text-blue-700 font-medium"
            >
              ← Back to Programs
          </Link>
          <div className="mx-auto max-w-[1280px] p-8 flex flex-col gap-8 pb-32">
            {/* Program Header Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-lg text-white">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Program Title</label>
                    <input 
                      type="text"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-blue-200 focus:ring-0 px-0 leading-tight focus:outline-none"
                      placeholder="Enter program name"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Duration</span>
                      <span className="font-medium">{phases.reduce((acc, phase) => acc + phase.durationWeeks, 0)} Weeks</span>
                    </div>
                    {/* <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Difficulty</span>
                      <span className="font-medium">Intermediate</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Focus</span>
                      <span className="font-medium">Hypertrophy</span>
                    </div> */}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* <button className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Details
                  </button> */}
                </div>
              </div>
            </div>

            {/* Phases */}
            {phases.map((phase) => (
              <div key={phase.id} className="flex flex-col rounded-xl bg-card shadow-sm border border-border">
                {/* Phase Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePhase(phase.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${phase.isExpanded ? "" : "-rotate-90"}`} />
                    </button>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={phase.name}
                        onChange={(e) => updatePhaseName(phase.id, e.target.value)}
                        className="text-lg font-bold text-card-foreground bg-transparent border-none p-0 focus:ring-0 w-full"
                        placeholder="Phase Name"
                      />
                      <input
                        type="text"
                        value={phase.description}
                        onChange={(e) => updatePhaseDescription(phase.id, e.target.value)}
                        className="text-sm text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full"
                        placeholder="Phase description"
                      />
                    </div>
                  </div>
                    <div className="flex items-center gap-3">
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
                      <button className="text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
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
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {day.duration} min
                                  </div>
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
                    <div className="bg-muted/50 px-6 py-3 border-t border-border rounded-b-xl flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Total Workouts: {phase.days.filter(d => d.type === "workout").length}</span>
                        <span>Est. Time: {phase.days.filter(d => d.type === "workout").reduce((sum, d) => sum + (d.duration || 0), 0)} min</span>
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
        </main>

        {/* Fixed Footer / Action Bar */}
        <div className="absolute bottom-0 right-0 left-0 md:left-[280px] bg-card/90 backdrop-blur-md border-t border-border px-8 py-4 z-20">
          <div className="flex items-center justify-between mx-auto max-w-[1280px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">

            </div>
            <div className="flex gap-4 ">
              <button 
                onClick={handleSaveProgram}
                disabled={isSaving}
                className="rounded-lg border border-border  px-4 py-2 text-sm font-semibold text-white  bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>

            </div>
          </div>
        </div>

        {/* Workout Editor Modal */}
        {selectedWorkout && (
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
                        // Filter exercises based on modal search
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
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // TODO: Implement save as template functionality
                      alert("Save as template - Coming soon!");
                    }}
                    className="px-4 py-2 border border-border text-card-foreground rounded-lg font-semibold hover:bg-muted transition-colors"
                  >
                    Save as Template
                  </button>
                  <button
                    onClick={closeWorkoutModal}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
