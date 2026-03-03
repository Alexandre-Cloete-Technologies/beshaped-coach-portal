"use client";

import { Plus, Search, ChevronDown, ChevronRight, Edit, Trash2, MoreHorizontal, Dumbbell, ChevronsUpDown, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ExerciseEditModal, { ExerciseEditValues } from "../components/ExerciseEditModal";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description?: string;
  instructions?: string[];
  videoUrl?: string;
  createdAt?: Date;
}

interface ExerciseFormData {
  name: string;
  description: string;
  instructions: {
    setup: string;
    posture: string;
    execution: string;
    breathing: string;
    control: string;
  };
  videoUrl: string;
  thumbnailUrl: string;
  anatomicalIllustration: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  category: string;
  tips: string[];
}

const emptyFormData: ExerciseFormData = {
  name: "",
  description: "",
  instructions: {
    setup: "",
    posture: "",
    execution: "",
    breathing: "",
    control: "",
  },
  videoUrl: "",
  thumbnailUrl: "",
  anatomicalIllustration: "",
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: "",
  category: "",
  tips: [],
};

const equipmentOptions = [
  "Barbell", "Dumbbells", "Cable Machine", "Machine", "Bodyweight", 
  "Kettlebell", "Resistance Bands", "Medicine Ball", "Pull-up Bar", "Bench", "Other"
];

const categoryOptions = [
  "Strength", "Hypertrophy", "Power", "Endurance", "Flexibility", "Cardio", "Rehabilitation"
];

const muscleCategoryDetails: Array<{ category: string; muscles: string[] }> = [
  { category: "Chest", muscles: ["Upper chest", "Chest"] },
  { category: "Back", muscles: ["Back","Traps", "Upper back", "Mid back", "Lats", "Erectors" ] },
  { category: "Shoulders", muscles: ["Front delts", "Side delts", "Rear delts"] },
  { category: "Arms", muscles: ["Biceps", "Triceps", "Forearms"] },
  { category: "Core", muscles: ["Abs"] },
  { category: "Cardio", muscles: ["Cardio"] },
  { category: "Legs", muscles: ["Quads", "Hamstrings", "Calves", "Glutes"] },
  { category: "Neck", muscles: ["Neck"] },
];

// Define muscle group order and icons
const muscleGroupOrder = [
  "Chest",
  "Back", 
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Full Body",
  "Cardio",
  "Neck",
  "Other"
];

// Map specific muscles to broader categories
const muscleToCategory: Record<string, string> = {
  // Chest
  "chest": "Chest",
  "pectorals": "Chest",
  "pecs": "Chest",
  "upper chest": "Chest",
  "lower chest": "Chest",
  
  // Back
  "back": "Back",
  "lats": "Back",
  "latissimus dorsi": "Back",
  "rhomboids": "Back",
  "traps": "Back",
  "trapezius": "Back",
  "lower back": "Back",
  "erector spinae": "Back",
  "erectors": "Back",
  "rear delts": "Back",
  "upper back": "Back",
  "mid back": "Back",
  
  // Shoulders
  "shoulders": "Shoulders",
  "delts": "Shoulders",
  "deltoids": "Shoulders",
  "front delts": "Shoulders",
  "side delts": "Shoulders",
  "lateral delts": "Shoulders",
  "anterior deltoid": "Shoulders",
  "posterior deltoid": "Shoulders",
  "rotator cuff": "Shoulders",
  
  // Arms
  "arms": "Arms",
  "biceps": "Arms",
  "triceps": "Arms",
  "forearms": "Arms",
  "brachialis": "Arms",
  "bicep": "Arms",
  "tricep": "Arms",
  "forearm": "Arms",
  "wrists": "Arms",
  
  // Legs
  "legs": "Legs",
  "quads": "Legs",
  "quadriceps": "Legs",
  "hamstrings": "Legs",
  "glutes": "Legs",
  "gluteus": "Legs",
  "calves": "Legs",
  "calf": "Legs",
  "hip flexors": "Legs",
  "adductors": "Legs",
  "abductors": "Legs",
  "thighs": "Legs",
  "lower body": "Legs",
  
  // Core
  "core": "Core",
  "abs": "Core",
  "abdominals": "Core",
  "obliques": "Core",
  "lower abs": "Core",
  "upper abs": "Core",
  "transverse abdominis": "Core",
  "hip": "Core",
  "pelvis": "Core",
  
  // Full Body
  "full body": "Full Body",
  "compound": "Full Body",
  "total body": "Full Body",
  "whole body": "Full Body",
  
  // Cardio
  "cardio": "Cardio",
  "cardiovascular": "Cardio",
  "heart": "Cardio",
  "conditioning": "Cardio",
  "endurance": "Cardio",

  // Neck
  "neck": "Neck",
  "cervical": "Neck",
};

// Function to get category from muscle name
const getCategoryFromMuscle = (muscle: string): string => {
  if (!muscle) return "Other";
  
  const normalized = muscle.toLowerCase().trim();
  
  // Direct match
  if (muscleToCategory[normalized]) {
    return muscleToCategory[normalized];
  }
  
  // Check if any key is contained in the muscle string
  for (const [key, category] of Object.entries(muscleToCategory)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }
  
  // Check if muscle string contains any category name directly
  for (const category of muscleGroupOrder) {
    if (normalized.includes(category.toLowerCase())) {
      return category;
    }
  }
  
  return "Other";
};

const getRawMuscleFromExerciseData = (data: any): string => {
  let rawMuscle =
    data.primaryMuscles?.[0] ||
    data.secondaryMuscles?.[0] ||
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

  if (Array.isArray(rawMuscle) && rawMuscle.length > 0) {
    rawMuscle = rawMuscle[0];
  } else if (rawMuscle && typeof rawMuscle === "object") {
    const muscleObj = rawMuscle as any;
    rawMuscle =
      muscleObj.name ||
      muscleObj.title ||
      muscleObj.slug ||
      muscleObj.label ||
      muscleObj.toString?.() ||
      "";
  }

  return String(rawMuscle || "");
};

// Mock exercises for fallback
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

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>(mockExercises);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Add exercise modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<ExerciseFormData>(emptyFormData);
  const [newTip, setNewTip] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit exercise modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [updating, setUpdating] = useState(false);

  // Delete exercise modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch exercises from Firebase
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const exercisesCollection = collection(db, "exercises");
        const exercisesSnapshot = await getDocs(exercisesCollection);
        
        if (!exercisesSnapshot.empty) {
          const fetchedExercises: Exercise[] = exercisesSnapshot.docs.map((doc) => {
            const data = doc.data();
            
            const rawMuscle = getRawMuscleFromExerciseData(data);
            
            // Use helper to categorize specific muscles (e.g. "Biceps" -> "Arms")
            const muscleCategory = getCategoryFromMuscle(String(rawMuscle));
            
            // Log for debugging (helpful to see what fields are available)
            // console.log("Exercise:", data.name, "Raw Muscle:", rawMuscle, "Category:", muscleCategory);
            
            return {
              id: doc.id,
              name: data.name || "Unnamed Exercise",
              muscleGroup: muscleCategory, // Normalized category
              primaryMuscles: Array.isArray(data.primaryMuscles) ? data.primaryMuscles : [],
              secondaryMuscles: Array.isArray(data.secondaryMuscles) ? data.secondaryMuscles : [],
              equipment: data.equipment || "None",
              difficulty: data.difficulty || "intermediate",
              description: data.description,
              instructions: data.instructions,
              videoUrl: data.videoUrl,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
            };
          });
          
          setExercises(fetchedExercises.length > 0 ? fetchedExercises : mockExercises);
        }
      } catch (error) {
        console.error("Error fetching exercises:", error);
        setExercises(mockExercises);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  // Group exercises by muscle group
  const groupedExercises = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    
    // Initialize all groups
    muscleGroupOrder.forEach(group => {
      groups[group] = [];
    });
    
    // Filter by search and group
    const filtered = searchQuery.trim() 
      ? exercises.filter(ex => 
          ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ex.equipment.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : exercises;
    
    filtered.forEach(exercise => {
      const group = muscleGroupOrder.includes(exercise.muscleGroup) 
        ? exercise.muscleGroup 
        : "Other";
      groups[group].push(exercise);
    });
    
    return groups;
  }, [exercises, searchQuery]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      // Expand all groups that have matching exercises
      const groupsWithMatches = new Set<string>();
      Object.entries(groupedExercises).forEach(([group, exs]) => {
        if (exs.length > 0) {
          groupsWithMatches.add(group);
        }
      });
      setExpandedGroups(groupsWithMatches);
    }
  }, [searchQuery, groupedExercises]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(muscleGroupOrder));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const allExpanded = expandedGroups.size === muscleGroupOrder.length;

  // Form handlers
  const handleInputChange = (field: keyof ExerciseFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInstructionChange = (field: keyof ExerciseFormData["instructions"], value: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: { ...prev.instructions, [field]: value }
    }));
  };

  const addTip = () => {
    if (newTip.trim()) {
      setFormData(prev => ({ ...prev, tips: [...prev.tips, newTip.trim()] }));
      setNewTip("");
    }
  };

  const removeTip = (index: number) => {
    setFormData(prev => ({ ...prev, tips: prev.tips.filter((_, i) => i !== index) }));
  };

  const toggleMuscle = (muscle: string, isPrimary: boolean) => {
    const field = isPrimary ? "primaryMuscles" : "secondaryMuscles";
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(muscle)) {
        return { ...prev, [field]: current.filter(m => m !== muscle) };
      } else {
        return { ...prev, [field]: [...current, muscle] };
      }
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setFormData(emptyFormData);
    setNewTip("");
  };

  const openEditModal = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingExercise(null);
    setUpdating(false);
  };

  const openDeleteModal = (exercise: Exercise) => {
    setDeletingExercise(exercise);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setShowDeleteModal(false);
    setDeletingExercise(null);
  };

  const handleDeleteExercise = async () => {
    if (!deletingExercise) return;

    try {
      setDeleting(true);
      await deleteDoc(doc(db, "exercises", deletingExercise.id));
      setExercises((prev) => prev.filter((ex) => ex.id !== deletingExercise.id));
      closeDeleteModal();
    } catch (error) {
      console.error("Error deleting exercise:", error);
      alert("Failed to delete exercise. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateExercise = async (values: ExerciseEditValues) => {
    if (!editingExercise) return;

    try {
      setUpdating(true);
      const exerciseRef = doc(db, "exercises", editingExercise.id);
      await updateDoc(exerciseRef, {
        name: values.name.trim(),
        description: values.description.trim() || null,
        equipment: values.equipment || "None",
        difficulty: values.difficulty,
        videoUrl: values.videoUrl.trim() || null,
        muscleGroup: values.muscleGroup,
        primaryMuscles: values.primaryMuscles,
        secondaryMuscles: values.secondaryMuscles,
        updatedAt: serverTimestamp(),
      });

      setExercises((prev) =>
        prev.map((ex) =>
          ex.id === editingExercise.id
            ? {
                ...ex,
                name: values.name.trim(),
                description: values.description.trim() || ex.description,
                equipment: values.equipment || "None",
                difficulty: values.difficulty,
                videoUrl: values.videoUrl.trim() || undefined,
                muscleGroup: values.muscleGroup,
                primaryMuscles: values.primaryMuscles,
                secondaryMuscles: values.secondaryMuscles,
              }
            : ex
        )
      );

      closeEditModal();
    } catch (error) {
      console.error("Error updating exercise:", error);
      alert("Failed to update exercise. Please try again.");
      setUpdating(false);
    }
  };

  const handleSaveExercise = async () => {
    if (!formData.name.trim()) {
      alert("Please enter an exercise name");
      return;
    }
    
    try {
      setSaving(true);
      await addDoc(collection(db, "exercises"), {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: "coach",
      });
      
      // Refresh exercises list
      const exercisesSnapshot = await getDocs(collection(db, "exercises"));
      const fetchedExercises: Exercise[] = exercisesSnapshot.docs.map((doc) => {
        const data = doc.data();
        const rawMuscle = getRawMuscleFromExerciseData(data);
        const muscleCategory = getCategoryFromMuscle(String(rawMuscle));
        return {
          id: doc.id,
          name: data.name || "Unnamed Exercise",
          muscleGroup: muscleCategory,
          primaryMuscles: Array.isArray(data.primaryMuscles) ? data.primaryMuscles : [],
          secondaryMuscles: Array.isArray(data.secondaryMuscles) ? data.secondaryMuscles : [],
          equipment: data.equipment || "None",
          difficulty: data.difficulty || "intermediate",
          description: data.description,
          instructions: data.instructions,
          videoUrl: data.videoUrl,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
        };
      });
      setExercises(fetchedExercises);
      closeModal();
    } catch (error) {
      console.error("Error saving exercise:", error);
      alert("Failed to save exercise. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
      case "intermediate":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "advanced":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const totalExercises = exercises.length;
  const filteredTotal = Object.values(groupedExercises).reduce((sum, exs) => sum + exs.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Exercise Library</h1>
              <p className="text-muted-foreground">
                {totalExercises} exercises organized by muscle group
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                placeholder="Search exercises by name, muscle, or equipment..."
              />
            </div>
            
            <div className="flex items-center gap-3">
              {/* Expand/Collapse All */}
              <button 
                onClick={allExpanded ? collapseAll : expandAll}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronsUpDown className="w-4 h-4" />
                {allExpanded ? "Collapse All" : "Expand All"}
              </button>
              
              {/* Add Button */}
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Exercise
              </button>
            </div>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Found {filteredTotal} exercise{filteredTotal !== 1 ? "s" : ""} matching "{searchQuery}"</span>
              <button 
                onClick={() => setSearchQuery("")}
                className="text-primary hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          {/* Grouped Exercises */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading exercises...
            </div>
          ) : (
            <div className="space-y-3">
              {muscleGroupOrder.map((group) => {
                const groupExercises = groupedExercises[group];
                const isExpanded = expandedGroups.has(group);
                const hasExercises = groupExercises.length > 0;
                
                // Hide empty groups when searching
                if (searchQuery && !hasExercises) return null;
                
                return (
                  <div 
                    key={group}
                    className="bg-card rounded-xl border border-border overflow-hidden"
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group)}
                      className={`w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors ${
                        !hasExercises ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!hasExercises}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Dumbbell className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-card-foreground">{group}</span>
                      </div>
                      <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                        hasExercises 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {groupExercises.length} exercise{groupExercises.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                    
                    {/* Expanded Content */}
                    {isExpanded && hasExercises && (
                      <div className="border-t border-border">
                        {groupExercises.map((exercise, idx) => (
                          <div 
                            key={exercise.id}
                            className={`flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group ${
                              idx !== groupExercises.length - 1 ? "border-b border-border/50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-card-foreground truncate">{exercise.name}</p>
                                {exercise.description && (
                                  <p className="text-xs text-muted-foreground truncate">{exercise.description}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyBadge(exercise.difficulty)}`}>
                                {exercise.difficulty.charAt(0).toUpperCase() + exercise.difficulty.slice(1)}
                              </span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                  type="button"
                                  onClick={() => openEditModal(exercise)}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  onClick={() => openDeleteModal(exercise)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredTotal === 0 && searchQuery && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">No exercises found matching "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-primary hover:underline text-sm"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add Exercise Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-border max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">Add New Exercise</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below</p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                {/* Exercise Name */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Exercise Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="e.g., Barbell Bench Press"
                  />
                </div>

                {/* Equipment */}
                {/* <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Equipment
                  </label>
                  <select
                    value={formData.equipment}
                    onChange={(e) => handleInputChange("equipment", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                  >
                    <option value="">Select Equipment</option>
                    {equipmentOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div> */}

                {/* Category */}
                {/* <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange("category", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div> */}

                {/* Video URL */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => handleInputChange("videoUrl", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="https://..."
                  />
                </div>

                {/* Description - full width */}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                    placeholder="Brief description of the exercise..."
                  />
                </div>

                {/* Primary Muscles */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Primary Muscles
                  </label>
                  <div className="space-y-3">
                    {muscleCategoryDetails.map(({ category, muscles }) => (
                      <div key={category}>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {muscles.map((muscle) => (
                            <button
                              key={`primary-${category}-${muscle}`}
                              type="button"
                              onClick={() => toggleMuscle(muscle, true)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                formData.primaryMuscles.includes(muscle)
                                  ? "bg-blue-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {muscle}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secondary Muscles */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Secondary Muscles
                  </label>
                  <div className="space-y-3">
                    {muscleCategoryDetails.map(({ category, muscles }) => (
                      <div key={category}>
                        <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{category}</p>
                        <div className="flex flex-wrap gap-2">
                          {muscles.map((muscle) => (
                            <button
                              key={`secondary-${category}-${muscle}`}
                              type="button"
                              onClick={() => toggleMuscle(muscle, false)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                formData.secondaryMuscles.includes(muscle)
                                  ? "bg-indigo-600 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {muscle}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                {/* <div className="col-span-2">
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Instructions
                  </label>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Setup</label>
                      <textarea
                        value={formData.instructions.setup}
                        onChange={(e) => handleInstructionChange("setup", e.target.value)}
                        className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                        placeholder="How to set up..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Posture</label>
                      <textarea
                        value={formData.instructions.posture}
                        onChange={(e) => handleInstructionChange("posture", e.target.value)}
                        className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                        placeholder="Correct posture..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Execution</label>
                      <textarea
                        value={formData.instructions.execution}
                        onChange={(e) => handleInstructionChange("execution", e.target.value)}
                        className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                        placeholder="How to perform..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Breathing</label>
                      <textarea
                        value={formData.instructions.breathing}
                        onChange={(e) => handleInstructionChange("breathing", e.target.value)}
                        className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                        placeholder="Breathing pattern..."
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] text-muted-foreground mb-1">Control</label>
                      <textarea
                        value={formData.instructions.control}
                        onChange={(e) => handleInstructionChange("control", e.target.value)}
                        className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                        placeholder="Control and tempo..."
                      />
                    </div>
                  </div>
                </div> */}

                {/* Thumbnail URL */}
                {/* <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={formData.thumbnailUrl}
                    onChange={(e) => handleInputChange("thumbnailUrl", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="https://..."
                  />
                </div> */}

                {/* Anatomical Illustration URL */}
                {/* <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Anatomical Illustration URL
                  </label>
                  <input
                    type="url"
                    value={formData.anatomicalIllustration}
                    onChange={(e) => handleInputChange("anatomicalIllustration", e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="https://..."
                  />
                </div> */}

                {/* Tips - full width */}
                {/* <div className="col-span-2">
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Tips & Notes
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTip}
                      onChange={(e) => setNewTip(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTip())}
                      className="flex-1 h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                      placeholder="Add a tip..."
                    />
                    <button
                      type="button"
                      onClick={addTip}
                      className="h-11 px-4 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {formData.tips.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {formData.tips.map((tip, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
                          <span className="flex-1 text-sm text-card-foreground">{tip}</span>
                          <button
                            type="button"
                            onClick={() => removeTip(index)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div> */}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setFormData(emptyFormData)}
                className="h-10 px-4 rounded-lg text-xs text-muted-foreground font-medium hover:text-card-foreground hover:bg-accent transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExercise}
                disabled={saving || !formData.name.trim()}
                className="h-10 px-5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Exercise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="px-6 py-5 border-b border-border">
              <h2 className="text-lg font-semibold text-card-foreground">Delete Exercise</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Are you sure you want to delete <span className="font-medium text-card-foreground">"{deletingExercise.name}"</span>?
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/20">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExercise}
                disabled={deleting}
                className="h-10 px-5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Exercise"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exercise Modal */}
      <ExerciseEditModal
        isOpen={showEditModal}
        exercise={editingExercise}
        muscleCategoryDetails={muscleCategoryDetails}
        saving={updating}
        onClose={closeEditModal}
        onSave={handleUpdateExercise}
      />
    </div>
  );
}
