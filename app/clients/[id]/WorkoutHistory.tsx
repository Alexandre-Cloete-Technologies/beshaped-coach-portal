"use client";

import { ChevronLeft, ChevronRight, Search, Filter, Download, List, LayoutGrid } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface WorkoutSet {
  setNumber: number;
  weight: string;
  reps: number;
  rpe: number;
}

interface ProgramExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  sets: number;
  repsRange: string;
  tempo?: string;
  restPeriod: string;
  notes: string | null;
}

interface Exercise {
  name: string;
  sets: WorkoutSet[];
}

// WorkoutLog exercise structure from Firebase
interface WorkoutLogExerciseSet {
  done: boolean;
  reps: string;
  weight: string;
}

interface WorkoutLogExercise {
  name: string;
  sets: WorkoutLogExerciseSet[];
}

interface WorkoutLog {
  id: string;
  completedAt: Date;
  userId: string;
  programName: string;
  phaseNumber: number;
  workoutName: string;
  dayNumber: number;
  weekNumber: number;
  totalDuration: number | null;
  status: "completed" | "in-progress" | "skipped";
  exercises: WorkoutLogExercise[];
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  notes: string | null;
}

interface Workout {
  date: string;
  dayOfWeek: string;
  time: string;
  name: string;
  status: "completed" | "partial" | "skipped";
  duration?: string;
  volume?: string;
  avgRpe?: number;
  exercises?: Exercise[];
  programExercises?: ProgramExercise[];
  workoutLogExercises?: WorkoutLogExercise[];
  phase?: string;
  workoutLogId?: string;
  programName?: string;
  phaseNumber?: number;
  weekNumber?: number;
  dayNumber?: number;
}

const mockWorkouts: Workout[] = [
  {
    date: "N/A",
    dayOfWeek: "N/A",
    time: "--:--",
    name: "No workouts found",
    status: "skipped",
    phase: "No program assigned",
  },
];

const normalizeWorkoutLogExercises = (
  data: Record<string, unknown>
): WorkoutLogExercise[] => {
  const candidateCollections: unknown[] = [
    data.exercises,
    data.workoutExercises,
    data.workout,
    data.exerciseList,
  ];

  const rawExercises = candidateCollections.find((candidate) => Array.isArray(candidate));
  if (!Array.isArray(rawExercises)) return [];

  return rawExercises
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((exercise) => {
      const rawSets = Array.isArray(exercise.sets) ? exercise.sets : [];
      const normalizedSets: WorkoutLogExerciseSet[] = rawSets
        .filter((set): set is Record<string, unknown> => Boolean(set && typeof set === "object"))
        .map((set) => ({
          done: Boolean(set.done ?? set.completed ?? false),
          reps: String(set.reps ?? set.targetReps ?? ""),
          weight: String(set.weight ?? set.weightKg ?? ""),
        }));

      return {
        name: String(exercise.name ?? exercise.exerciseName ?? exercise.title ?? "Unknown Exercise"),
        sets: normalizedSets,
      };
    });
};



export default function WorkoutHistory() {
  const params = useParams();
  const clientId = params?.id as string;
  
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [expandedWorkout, setExpandedWorkout] = useState<number>(0);
  
  // Program and workout data from Firestore
  const [programWorkouts, setProgramWorkouts] = useState<Array<{ 
    workoutName: string;
    phase: string;
    phaseOrder: number;
    dayNumber: number;
    isRestDay: boolean;
    description?: string;
    exercises: Array<{
      exerciseId: string;
      exerciseName: string;
      order: number;
      sets: number;
      repsRange: string;
      tempo?: string;
      restPeriod: string;
      notes: string | null;
    }>;
  }>>([]);
  const [loadingProgram, setLoadingProgram] = useState(true);
  
  // WorkoutLogs from Firebase
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  
  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today); // Default to today
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month">("month");

  // Fetch client's program and extract workout names from phase maps
  useEffect(() => {
    const fetchProgramWorkouts = async () => {
      if (!clientId) return;
      
      try {
        setLoadingProgram(true);
        
        // Fetch the client/user document
        const userDoc = await getDoc(doc(db, "users", clientId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user has a currentProgram reference
          if (userData.currentProgram) {
            let programDoc;
            
            // Handle DocumentReference
            if (userData.currentProgram.path) {
              programDoc = await getDoc(userData.currentProgram);
            } else if (typeof userData.currentProgram === 'string') {
              // If it's a string ID, fetch it from programs collection
              programDoc = await getDoc(doc(db, "programs", userData.currentProgram));
            }
            
            if (programDoc && programDoc.exists()) {
              const programData: any = programDoc.data();
              
              // Extract workouts with exercises from phase maps
              const workouts: Array<{ 
                workoutName: string;
                phase: string;
                phaseOrder: number;
                dayNumber: number;
                isRestDay: boolean;
                description?: string;
                exercises: Array<{
                  exerciseId: string;
                  exerciseName: string;
                  order: number;
                  sets: number;
                  repsRange: string;
                  tempo?: string;
                  restPeriod: string;
                  notes: string | null;
                }>;
              }> = [];
              
              if (programData.phases && Array.isArray(programData.phases)) {
                // Iterate through phases
                programData.phases.forEach((phase: any, phaseIndex: number) => {
                  const phaseName = phase.name || `Phase ${phaseIndex + 1}`;
                  const phaseOrder = phase.order || phaseIndex + 1;
                  
                  // Each phase has workouts array
                  if (phase.workouts && Array.isArray(phase.workouts)) {
                    phase.workouts.forEach((workout: any) => {
                      // Skip rest days or workouts without names
                      if (workout.workoutName && !workout.isRestDay) {
                        workouts.push({ 
                          workoutName: workout.workoutName || workout.dayName || '',
                          phase: phaseName,
                          phaseOrder: phaseOrder,
                          dayNumber: workout.dayNumber || 0,
                          isRestDay: workout.isRestDay || false,
                          description: workout.description,
                          exercises: (workout.exercises || []).map((ex: any) => ({
                            exerciseId: ex.exerciseId || '',
                            exerciseName: ex.exerciseName || '',
                            order: ex.order || 0,
                            sets: ex.sets || 0,
                            repsRange: ex.repsRange || '',
                            tempo: ex.tempo,
                            restPeriod: ex.restPeriod || '',
                            notes: ex.notes || null,
                          })),
                        });
                      }
                    });
                  }
                });
              }
              
              setProgramWorkouts(workouts);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching program workouts:", error);
      } finally {
        setLoadingProgram(false);
      }
    };

    fetchProgramWorkouts();
  }, [clientId]);

  // Fetch workout logs for this client
  useEffect(() => {
    const fetchWorkoutLogs = async () => {
      if (!clientId) return;
      
      try {
        const workoutLogsRef = collection(db, "workoutLogs");
        const userRef = doc(db, "users", clientId);

        // Query with BOTH formats: userId can be stored as string (clientId) or DocumentReference
        const [stringSnapshot, refSnapshot] = await Promise.all([
          getDocs(query(workoutLogsRef, where("userId", "==", clientId))),
          getDocs(query(workoutLogsRef, where("userId", "==", userRef))),
        ]);

        const seenIds = new Set<string>();
        const allDocs = [...stringSnapshot.docs, ...refSnapshot.docs].filter((d) => {
          if (seenIds.has(d.id)) return false;
          seenIds.add(d.id);
          return true;
        });

        const logs: WorkoutLog[] = allDocs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const toDate = (val: unknown): Date | null => {
            if (!val) return null;
            if (typeof val === "object" && val !== null && "toDate" in val && typeof (val as { toDate: () => Date }).toDate === "function") {
              return (val as { toDate: () => Date }).toDate();
            }
            if (val instanceof Date) return val;
            if (typeof val === "string" || typeof val === "number") return new Date(val);
            return null;
          };
          // Use completedAt, dateCompleted (client app), or startedAt for in-progress logs
          const completedAt = toDate(data.completedAt) ?? toDate(data.dateCompleted) ?? toDate(data.startedAt) ?? new Date();
          return {
            id: docSnap.id,
            completedAt,
            userId: String(data.userId || ""),
            programName: String(data.programName || ""),
            phaseNumber: Number(data.phaseNumber || 1),
            workoutName: String(data.workoutName || ""),
            dayNumber: Number(data.dayNumber || 0),
            weekNumber: Number(data.weekNumber || 0),
            totalDuration: (data.totalDuration as number | null) || null,
            status: (() => {
              const s = String(data.status || "");
              return (s === "completed" || s === "in-progress" || s === "skipped" ? s : "in-progress") as "completed" | "in-progress" | "skipped";
            })(),
            exercises: normalizeWorkoutLogExercises(data),
            totalVolume: Number(data.totalVolume || 0),
            totalSets: Number(data.totalSets || 0),
            totalReps: Number(data.totalReps || 0),
            notes: (data.notes as string | null) || null,
          };
        });

        // Only include completed workouts
        const completedLogs = logs.filter((log) => log.status === "completed");

        // Sort by date (most recent first)
        completedLogs.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

        setWorkoutLogs(completedLogs);
        console.log("Fetched workout logs:", completedLogs);
      } catch (error) {
        console.error("Error fetching workout logs:", error);
      }
    };

    fetchWorkoutLogs();
  }, [clientId]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Handle day click
  const handleDayClick = (dayData: any) => {
    if (dayData.isCurrentMonth) {
      setSelectedDate(dayData.date);
      setTimePeriod("day");
    }
  };

  // Generate year options (current year - 5 to + 14 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = -5; i <= 14; i++) {
      years.push(today.getFullYear() + i);
    }
    return years;
  }, [today]);

  // Helper function to check if a value is a valid Date
  const isValidDate = (date: unknown): date is Date => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date | null | undefined, date2: Date | null | undefined): boolean => {
    if (!date1 || !date2 || !isValidDate(date1) || !isValidDate(date2)) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Helper function to check if a date is within a week
  const isWithinWeek = (date: Date | null | undefined, weekStart: Date, weekEnd: Date): boolean => {
    if (!date || !isValidDate(date)) return false;
    const time = date.getTime();
    return time >= weekStart.getTime() && time <= weekEnd.getTime();
  };

  // Helper function to check if a date is within a month
  const isWithinMonth = (date: Date | null | undefined, month: number, year: number): boolean => {
    if (!date || !isValidDate(date)) return false;
    return date.getMonth() === month && date.getFullYear() === year;
  };

  // Filter workouts based on selected time period
  const filteredWorkouts = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // If we have workoutLogs, use those as the primary data source
    if (workoutLogs.length > 0) {
      // Filter out logs with invalid completedAt dates first
      const validLogs = workoutLogs.filter((log) => isValidDate(log.completedAt));
      
      // First, filter workout logs based on selected time period and date
      let filteredLogs = validLogs;

      if (timePeriod === "day" && selectedDate) {
        // Filter to show only workouts completed on the selected day
        filteredLogs = validLogs.filter((log) => 
          isSameDay(log.completedAt, selectedDate)
        );
      } else if (timePeriod === "week" && selectedDate) {
        // Get week boundaries (Monday to Sunday)
        const weekStart = new Date(selectedDate);
        const day = selectedDate.getDay();
        const diff = (day === 0 ? 6 : day - 1); // Adjust for Monday start (Mon=0, Sun=6)
        weekStart.setDate(selectedDate.getDate() - diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        filteredLogs = validLogs.filter((log) => 
          isWithinWeek(log.completedAt, weekStart, weekEnd)
        );
      } else if (timePeriod === "month") {
        // Filter to show only workouts completed in the current selected month
        filteredLogs = validLogs.filter((log) => 
          isWithinMonth(log.completedAt, currentMonth, currentYear)
        );
      }

      // Map filtered logs to Workout format
      const workoutsFromLogs: Workout[] = filteredLogs.map((log) => {
        const date = log.completedAt;
        
        // Format time manually to ensure consistency
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = String(minutes).padStart(2, '0');
        const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;
        
        return {
          date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
          dayOfWeek: dayNames[date.getDay()],
          time: timeString,
          name: log.workoutName,
          status: log.status === "in-progress" ? "partial" : log.status as "completed" | "partial" | "skipped",
          phase: `Day ${log.dayNumber} - Week ${log.weekNumber} - Phase ${log.phaseNumber}`,
          workoutLogExercises: log.exercises,
          duration: log.totalDuration ? `${log.totalDuration}m` : undefined,
          volume: log.totalVolume ? `${log.totalVolume.toLocaleString()} lb` : undefined,
          workoutLogId: log.id,
          programName: log.programName,
          phaseNumber: log.phaseNumber,
          weekNumber: log.weekNumber,
          dayNumber: log.dayNumber,
        };
      });
      
      return workoutsFromLogs;
    }
    
    // Fall back to program workouts if no workout logs
    const generatedWorkouts: Workout[] = programWorkouts.map((programWorkout, index) => {
      // Generate mock date for display (you can replace with actual dates from Firebase)
      const date = new Date();
      date.setDate(date.getDate() - index);
      
      return {
        date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
        dayOfWeek: programWorkout.workoutName || dayNames[date.getDay()],
        time: index === 0 ? "9:00 AM" : "--:--",
        name: programWorkout.workoutName,
        status: (index === 0 ? "completed" : "completed") as "completed" | "partial" | "skipped",
        phase: `Day ${programWorkout.dayNumber} - Phase ${programWorkout.phaseOrder}`, // Fallback mock
        programExercises: programWorkout.exercises,
        duration: index === 0 ? "1h 15m" : undefined,
        volume: index === 0 ? "15,240 lb" : undefined,
        avgRpe: index === 0 ? 8.5 : undefined,
        // Mock values for fallback
        programName: "Hypertrophy Program",
        phaseNumber: programWorkout.phaseOrder,
        weekNumber: 1,
        dayNumber: programWorkout.dayNumber,
      };
    });

    // If no program workouts, fall back to mock data
    return generatedWorkouts.length > 0 ? generatedWorkouts : mockWorkouts;
  }, [timePeriod, selectedDate, programWorkouts, workoutLogs, currentMonth, currentYear]);

  // Get display title based on time period
  const getWorkoutListTitle = () => {
    if (timePeriod === "day" && selectedDate) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${days[selectedDate.getDay()]}, ${months[selectedDate.getMonth()]} ${selectedDate.getDate()}`;
    } else if (timePeriod === "week" && selectedDate) {
      return `Week of ${selectedDate.toLocaleDateString()}`;
    } else {
      return `${monthNames[currentMonth]} ${currentYear}`;
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDay = firstDayOfMonth.getDay();
    // Adjust for Monday start: Sunday (0) becomes 6, others shift down by 1
    const startingDayOfWeek = firstDay === 0 ? 6 : firstDay - 1;

    // Create a map of dates with workouts for O(1) lookup
    // Use UTC date components to avoid timezone shifting - e.g. "March 1" stored as midnight UTC
    // would incorrectly show as Feb 28 in timezones west of UTC with local methods
    const workoutDates = new Map();
    workoutLogs.forEach(log => {
      if (isValidDate(log.completedAt)) {
        const dateKey = `${log.completedAt.getUTCFullYear()}-${String(log.completedAt.getUTCMonth() + 1).padStart(2, "0")}-${String(log.completedAt.getUTCDate()).padStart(2, "0")}`;
        // Store the workout details
        // If multiple workouts on same day, prioritize "completed" or simply take the first one found
        if (!workoutDates.has(dateKey) || log.status === "completed") {
           workoutDates.set(dateKey, {
             status: log.status,
             phaseNumber: log.phaseNumber,
             weekNumber: log.weekNumber,
             dayNumber: log.dayNumber
           });
        }
      }
    });

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      isPreviousMonth: boolean;
      isNextMonth: boolean;
      date: Date;
      status: "completed" | "in-progress" | "skipped" | null;
      phaseNumber?: number;
      weekNumber?: number;
      dayNumber?: number;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Add days from previous month
    if (startingDayOfWeek > 0) {
      const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = new Date(currentYear, currentMonth - 1, day);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const workoutData = workoutDates.get(dateKey);
        
        days.push({
          day,
          isCurrentMonth: false,
          isPreviousMonth: true,
          isNextMonth: false,
          date,
          status: workoutData?.status || null,
          phaseNumber: workoutData?.phaseNumber,
          weekNumber: workoutData?.weekNumber,
          dayNumber: workoutData?.dayNumber,
          isToday: false,
          isSelected: false,
        });
      }
    }

    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday =
        day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      const isSelected =
        selectedDate !== null &&
        day === selectedDate.getDate() &&
        currentMonth === selectedDate.getMonth() &&
        currentYear === selectedDate.getFullYear();

      const workoutData = workoutDates.get(dateKey);

      days.push({
        day,
        isCurrentMonth: true,
        isPreviousMonth: false,
        isNextMonth: false,
        date,
        status: workoutData?.status || null,
        phaseNumber: workoutData?.phaseNumber,
        weekNumber: workoutData?.weekNumber,
        dayNumber: workoutData?.dayNumber,
        isToday,
        isSelected,
      });
    }

    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const workoutData = workoutDates.get(dateKey);
      
      days.push({
        day,
        isCurrentMonth: false,
        isPreviousMonth: false,
        isNextMonth: true,
        date,
        status: workoutData?.status || null,
        phaseNumber: workoutData?.phaseNumber,
        weekNumber: workoutData?.weekNumber,
        dayNumber: workoutData?.dayNumber,
        isToday: false,
        isSelected: false,
      });
    }

    return days;
  }, [currentMonth, currentYear, today, selectedDate, workoutLogs]);

  // Get month name
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentMonthName = monthNames[currentMonth];

  const getStatusDotColor = (status: string | null) => {
    if (status === "completed") return "bg-green-500";
    if (status === "partial" || status === "in-progress") return "bg-orange-500";
    if (status === "skipped") return "bg-red-500";
    return "";
  };

  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
          Completed
        </span>
      );
    }
    if (status === "skipped") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Skipped
        </span>
      );
    }
    return null;
  };

  const getRpeColor = (rpe: number) => {
    if (rpe >= 9) return "text-orange-500";
    return "text-green-600";
  };

  return (
    <div className="flex flex-col gap-6">
      {loadingProgram && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
          Loading workout names from program...
        </div>
      )}
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            className="w-full h-10 pl-10 pr-4 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
            placeholder="Search by workout name..."
            type="text"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">



        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Left Sidebar - Calendar and Stats */}
        <div className="w-full lg:w-1/3 shrink-0 flex flex-col gap-6">
          {/* Calendar */}
          <div className="bg-card rounded-xl border border-border p-6">
            {/* Month/Year Selectors */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="flex-1 h-9 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="w-24 h-9 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={goToPreviousMonth}
                className="p-1 hover:bg-accent rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h3 className="text-lg font-bold text-card-foreground">
                {currentMonthName} {currentYear}
              </h3>
              <button 
                onClick={goToNextMonth}
                className="p-1 hover:bg-accent rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Time Period Filter */}
            <div className="flex gap-1 mb-4 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setTimePeriod("day")}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  timePeriod === "day"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setTimePeriod("week")}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  timePeriod === "week"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimePeriod("month")}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  timePeriod === "month"
                    ? "bg-card text-card-foreground shadow-sm"
                    : "text-muted-foreground hover:text-card-foreground"
                }`}
              >
                Month
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                <div key={day} className="text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayData, index) => (
                <div
                  key={index}
                  onClick={() => handleDayClick(dayData)}
                  className={`aspect-square flex flex-col items-center justify-center relative cursor-pointer rounded-lg transition-all ${
                    dayData.isToday && !dayData.isSelected
                      ? "bg-primary text-white shadow-lg shadow-blue-500/30"
                      : dayData.isSelected
                      ? "bg-primary/80 text-white ring-2 ring-primary ring-offset-2 ring-offset-card"
                      : dayData.isCurrentMonth
                      ? "hover:bg-accent hover:scale-105"
                      : "opacity-40"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      dayData.isToday || dayData.isSelected
                        ? "font-bold"
                        : dayData.isCurrentMonth
                        ? "text-card-foreground"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    {dayData.day}
                  </span>
                  {dayData.status && (
                    <span
                      className={`text-[8px] font-bold mt-0.5 leading-tight whitespace-nowrap px-1 rounded ${
                        dayData.isToday || dayData.isSelected 
                          ? "text-white/90" 
                          : dayData.status === "completed" 
                            ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
                            : dayData.status === "in-progress"
                            ? "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30"
                            : "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30"
                      }`}
                    >
                      {`D${dayData.dayNumber}/W${dayData.weekNumber}/P${dayData.phaseNumber}`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            {/* <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                <span>Partial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Skipped</span>
              </div>
            </div> */}
          </div>

          {/* Monthly Summary */}
          {/* <div className="bg-card rounded-xl border border-border p-6">
            <h4 className="font-bold text-card-foreground mb-4">Monthly Summary</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Consistency</span>
                <span className="text-sm font-bold text-green-600">92%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: "92%" }}></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Total Volume</div>
                  <div className="text-sm font-bold text-card-foreground">142k lb</div>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Workouts</div>
                  <div className="text-sm font-bold text-card-foreground">22</div>
                </div>
              </div>
            </div>
          </div> */}
        </div>

        {/* Right Content - Workout List */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-card-foreground">{getWorkoutListTitle()}</h3>
              {filteredWorkouts.length > 0 && filteredWorkouts[0].programName && (
                <span className="text-sm font-medium text-muted-foreground">
                  {filteredWorkouts[0].programName}
                </span>
              )}
            </div>
          </div>

          {/* Today's Workout - Expanded by Default */}
          {filteredWorkouts.map((workout, index) => (
            <div key={index}>
              {index === 1 && (
                <div className="flex items-center gap-4 my-6">
                  <div className="h-px bg-border flex-1"></div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Previous days
                  </span>
                  <div className="h-px bg-border flex-1"></div>
                </div>
              )}

              <details
                className="group bg-card rounded-xl border border-border overflow-hidden opacity-90 hover:opacity-100 transition-opacity"
                open={index === expandedWorkout}
              >
                <summary className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-5 cursor-pointer hover:bg-accent/50 transition-colors select-none relative list-none">
                  <div className="flex items-center gap-4 min-w-[120px]">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground border border-border">
                      <span className="text-xs font-bold uppercase tracking-wide">{workout.date.split(" ")[0]}</span>
                      <span className="text-xl font-bold leading-none">{workout.date.split(" ")[1]}</span>
                    </div>
                    <div>
                      <h4 className="text-card-foreground font-bold text-base">{workout.dayOfWeek}</h4>
                      <p className="text-muted-foreground text-xs">{workout.time}</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-card-foreground font-bold text-lg">{workout.name}</h3>
                      {workout.phase && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {workout.phase}
                          </span>
                        </div>
                      )}
                      {index === 0 && workout.duration && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{workout.duration} duration</span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span>{workout.volume} vol</span>
                        </div>
                      )}
                      {index !== 0 && <div className="flex items-center gap-2">{getStatusBadge(workout.status)}</div>}
                    </div>
                    {/* <div className="flex items-center gap-6 mr-8">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Avg RPE
                        </span>
                        <span className="text-lg font-bold text-card-foreground">
                          {workout.avgRpe ? workout.avgRpe.toFixed(1) : "--"}
                        </span>
                      </div>
                    </div> */}
                  </div>

                  <div className="absolute right-5 top-5 md:static md:right-auto md:top-auto">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-open:rotate-90 transition-transform duration-200" />
                  </div>
                </summary>

                {/* Display exercises from workoutLogs (primary) */}
                {workout.workoutLogExercises && workout.workoutLogExercises.length > 0 ? (
                  <div className="border-t border-border bg-muted/30 p-5">
                    {/* Phase Info Header */}
                    {workout.phase && (
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                        <span className="text-sm font-medium text-card-foreground">{workout.phase}</span>
                      </div>
                    )}
                    <div className="grid gap-3">
                      {workout.workoutLogExercises.map((exercise, exIdx) => (
                        <div key={exIdx} className="bg-card rounded-lg p-4 border border-border">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-bold text-card-foreground text-sm">
                              {exIdx + 1}. {exercise.name}
                            </h5>
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                              {exercise.sets.length} Sets
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {exercise.sets.map((set, setIdx) => (
                              <div
                                key={setIdx}
                                className={`p-2 rounded flex flex-col items-center justify-center text-center ${
                                  set.done 
                                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                                    : "bg-muted border border-border"
                                }`}
                              >
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">
                                  Set {setIdx + 1}
                                </span>
                                {set.done && set.weight && set.reps ? (
                                  <span className="font-bold text-card-foreground">
                                    {set.weight} x {set.reps}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">--</span>
                                )}
                                {set.done ? (
                                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">✓ Done</span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">Not done</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : workout.programExercises && workout.programExercises.length > 0 ? (
                  <div className="border-t border-border bg-muted/30 p-5">
                    {/* Phase Info Header */}
                    {workout.phase && (
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                        <span className="text-sm font-medium text-card-foreground">{workout.phase}</span>
                      </div>
                    )}
                    <div className="grid gap-3">
                      {workout.programExercises.map((exercise, exIdx) => (
                        <div key={exIdx} className="bg-card rounded-lg p-4 border border-border">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-bold text-card-foreground text-sm">
                              {exercise.order}. {exercise.exerciseName}
                            </h5>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                                {exercise.sets} Sets
                              </span>
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                {exercise.repsRange} Reps
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            {exercise.restPeriod && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Rest:</span> {exercise.restPeriod}
                              </span>
                            )}
                            {exercise.tempo && (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">Tempo:</span> {exercise.tempo}
                              </span>
                            )}
                          </div>
                          {exercise.notes && (
                            <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary pl-2">
                              {exercise.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : workout.exercises ? (
                  <div className="border-t border-border bg-muted/30 p-5">
                    <div className="grid gap-4">
                      {workout.exercises.map((exercise, exIdx) => (
                        <div key={exIdx} className="bg-card rounded-lg p-4 border border-border">
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-bold text-card-foreground text-sm">
                              {exIdx + 1}. {exercise.name}
                            </h5>
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                              {exercise.sets.length} Sets
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                            {exercise.sets.map((set) => (
                              <div
                                key={set.setNumber}
                                className="p-2 bg-muted rounded flex flex-col items-center justify-center text-center"
                              >
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">
                                  Set {set.setNumber}
                                </span>
                                <span className="font-bold text-card-foreground">
                                  {set.weight} x {set.reps}
                                </span>
                                <span className={`text-[10px] ${getRpeColor(set.rpe)}`}>@ {set.rpe} RPE</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-border bg-muted/30 p-5">
                    <div className="flex flex-col gap-2">
                      {workout.phase && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide text-primary">Phase & Day:</span>
                          <span className="text-sm text-card-foreground">{workout.phase}</span>
                        </div>
                      )}
                      <p className="text-muted-foreground text-sm italic">
                        {workout.status === "skipped" ? "No data recorded." : "No exercises found for this workout."}
                      </p>
                    </div>
                  </div>
                )}
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
