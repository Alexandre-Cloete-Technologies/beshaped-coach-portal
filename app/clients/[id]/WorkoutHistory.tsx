"use client";

import { ChevronLeft, ChevronRight, Search, } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { requireServerResult } from "@/lib/firebase/serverResult";

// WorkoutLog exercise structure from Firebase
interface WorkoutLogExerciseSet {
  setNumber: number;
  completed: boolean;
  reps: string;
  weight: string;
}

interface WorkoutLogExercise {
  name: string;
  order: number;
  sets: WorkoutLogExerciseSet[];
}

interface WorkoutLog {
  id: string;
  startedAt: Date | null;
  completedAt: Date | null;
  /** Local calendar day of the session: dateCompleted, else timeCompletedAt, else timeStartedAt. */
  logDate: Date;
  userId: string;
  programName: string;
  phaseNumber: number;
  workoutName: string;
  dayNumber: number;
  weekNumber: number;
  /** Session length in seconds. */
  totalDuration: number | null;
  status: "completed" | "to-be-completed" | "in-progress" | "skipped";
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
  startedTime: string;
  completedTime: string;
  name: string;
  status: "completed" | "partial" | "skipped";
  duration?: string;
  volume?: string;
  workoutLogExercises?: WorkoutLogExercise[];
  phase?: string;
  workoutLogId?: string;
  programName?: string;
  phaseNumber?: number;
  weekNumber?: number;
  dayNumber?: number;
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

function isSameDay(
  date1: Date | null | undefined,
  date2: Date | null | undefined
): boolean {
  if (!date1 || !date2 || !isValidDate(date1) || !isValidDate(date2)) {
    return false;
  }
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isWithinWeek(
  date: Date | null | undefined,
  weekStart: Date,
  weekEnd: Date
): boolean {
  if (!date || !isValidDate(date)) return false;
  const time = date.getTime();
  return time >= weekStart.getTime() && time <= weekEnd.getTime();
}

function isWithinMonth(
  date: Date | null | undefined,
  month: number,
  year: number
): boolean {
  if (!date || !isValidDate(date)) return false;
  return date.getMonth() === month && date.getFullYear() === year;
}

function toDateValue(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null && "toDate" in val && typeof (val as { toDate: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return null;
}

function formatClockTime(date: Date | null | undefined): string {
  if (!date || !isValidDate(date)) return "--";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = String(minutes).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function formatDurationFromMs(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/** `totalDuration` on workoutLogs is seconds. Fall back to elapsed start→end if needed. */
function formatWorkoutDuration(
  totalDurationSeconds: number | null,
  startedAt: Date | null,
  completedAt: Date | null
): string {
  if (totalDurationSeconds != null && totalDurationSeconds > 0) {
    const formatted = formatDurationFromMs(totalDurationSeconds * 1000);
    if (formatted) return formatted;
  }

  if (startedAt && completedAt && isValidDate(startedAt) && isValidDate(completedAt)) {
    const elapsed = completedAt.getTime() - startedAt.getTime();
    const eightHours = 8 * 60 * 60 * 1000;
    if (elapsed >= 1_000 && elapsed <= eightHours) {
      const formatted = formatDurationFromMs(elapsed);
      if (formatted) return formatted;
    }
  }

  return "--";
}

/**
 * The local calendar day of a stored moment (#50). The app saves `dateCompleted` as the moment the workout was
 * finished (or the day the client picked), so its UTC date is the previous day for anything finished before 02:00
 * in Namibia / South Africa. Local date parts give the day the client trained; an old midnight-UTC value is 02:00
 * local, so it stays on the same day too.
 */
function calendarDateFromValue(val: unknown): Date | null {
  const d = toDateValue(val);
  if (!d || !isValidDate(d)) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

type CalendarDayCell = {
  day: number;
  isCurrentMonth: boolean;
  isPreviousMonth: boolean;
  isNextMonth: boolean;
  date: Date;
  status: "completed" | "in-progress" | "skipped" | null;
  phaseNumber?: number;
  weekNumber?: number;
  dayNumber?: number;
  isSelected: boolean;
};

const normalizeWorkoutLogExercises = (
  data: Record<string, unknown>
): WorkoutLogExercise[] => {
  const rawExercises = Array.isArray(data.exercises) ? data.exercises : [];

  return rawExercises
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((exercise, index) => {
      const rawSets = Array.isArray(exercise.sets) ? exercise.sets : [];
      const normalizedSets: WorkoutLogExerciseSet[] = rawSets
        .filter((set): set is Record<string, unknown> => Boolean(set && typeof set === "object"))
        .map((set, setIndex) => ({
          setNumber: Number(set.setNumber ?? setIndex + 1),
          completed: Boolean(set.completed ?? set.done ?? false),
          reps: String(set.reps ?? ""),
          weight: String(set.weight ?? ""),
        }))
        .sort((a, b) => a.setNumber - b.setNumber);

      return {
        name: String(exercise.exerciseName ?? exercise.name ?? "Unknown Exercise"),
        order: Number(exercise.order ?? index + 1),
        sets: normalizedSets,
      };
    })
    .sort((a, b) => a.order - b.order);
};



export default function WorkoutHistory() {
  const params = useParams();
  const clientId = params?.id as string;
  
  // const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

  
  // WorkoutLogs from Firebase
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  // Never fall back to made-up workouts: show loading, an error with Retry, or an honest empty state.
  const [logsStatus, setLogsStatus] = useState<"loading" | "error" | "ready">("loading");
  const [reloadKey, setReloadKey] = useState(0);
  
  // Calendar state — stable "today" for the session (avoids exhaustive-deps on `new Date()` each render)
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month">("month");

  // Fetch completed workoutLogs for this client (userId is the Auth UID string)
  useEffect(() => {
    const fetchWorkoutLogs = async () => {
      if (!clientId) return;
      
      try {
        setLogsStatus("loading");
        const snapshot = requireServerResult(
          await getDocs(query(collection(db, "workoutLogs"), where("userId", "==", clientId)))
        );

        const logs: WorkoutLog[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const startedAt = toDateValue(data.timeStartedAt);
          const completedAt =
            toDateValue(data.timeCompletedAt) ?? toDateValue(data.dateCompleted);
          const dateCompleted = calendarDateFromValue(data.dateCompleted);
          const logDate = dateCompleted ?? calendarDateFromValue(completedAt) ?? calendarDateFromValue(startedAt) ?? new Date(0);
          const rawDuration = data.totalDuration;
          const totalDuration =
            typeof rawDuration === "number"
              ? rawDuration
              : rawDuration != null
                ? Number(rawDuration) || null
                : null;
          const statusRaw = String(data.status || "");
          const status = (
            statusRaw === "completed" ||
            statusRaw === "to-be-completed" ||
            statusRaw === "in-progress" ||
            statusRaw === "skipped"
              ? statusRaw
              : "to-be-completed"
          ) as WorkoutLog["status"];

          return {
            id: docSnap.id,
            startedAt,
            completedAt,
            logDate,
            userId: String(data.userId || ""),
            programName: String(data.programName || ""),
            phaseNumber: Number(data.phaseNumber || 1),
            workoutName: String(data.workoutName || data.routineName || ""),
            dayNumber: Number(data.dayNumber || 0),
            weekNumber: Number(data.weekNumber || 0),
            totalDuration,
            status,
            exercises: normalizeWorkoutLogExercises(data),
            totalVolume: Number(data.totalVolume || 0),
            totalSets: Number(data.totalSets || 0),
            totalReps: Number(data.totalReps || 0),
            notes: (data.notes as string | null) || null,
          };
        });

        const completedLogs = logs.filter((log) => {
          if (log.status === "to-be-completed") return false;
          if (log.status !== "completed") return false;
          return isValidDate(log.completedAt);
        });

        completedLogs.sort((a, b) => b.logDate.getTime() - a.logDate.getTime());

        setWorkoutLogs(completedLogs);
        setLogsStatus("ready");
      } catch (error) {
        console.error("Error fetching workout logs:", error);
        setLogsStatus("error");
      }
    };

    fetchWorkoutLogs();
  }, [clientId, reloadKey]);

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
  const handleDayClick = (dayData: CalendarDayCell) => {
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

  // Filter workouts based on selected time period
  const filteredWorkouts = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // If we have workoutLogs, use those as the primary data source
    if (workoutLogs.length > 0) {
      // Filter out logs with invalid completedAt dates first
      const validLogs = workoutLogs.filter((log) => isValidDate(log.logDate) && log.logDate.getTime() > 0);
      
      // First, filter workout logs based on selected time period and date
      let filteredLogs = validLogs;

      if (timePeriod === "day" && selectedDate) {
        // Filter to show only workouts completed on the selected day
        filteredLogs = validLogs.filter((log) => 
          isSameDay(log.logDate, selectedDate)
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
          isWithinWeek(log.logDate, weekStart, weekEnd)
        );
      } else if (timePeriod === "month") {
        // Filter to show only workouts completed in the current selected month
        filteredLogs = validLogs.filter((log) => 
          isWithinMonth(log.logDate, currentMonth, currentYear)
        );
      }

      // Map filtered logs to Workout format
      const workoutsFromLogs: Workout[] = filteredLogs.map((log) => {
        const date = log.logDate;
        const completedTime = formatClockTime(log.completedAt);
        const startedTime = formatClockTime(log.startedAt);
        const duration = formatWorkoutDuration(log.totalDuration, log.startedAt, log.completedAt);
        
        return {
          date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
          dayOfWeek: dayNames[date.getDay()],
          time: completedTime,
          startedTime,
          completedTime,
          name: log.workoutName,
          status: log.status === "in-progress" ? "partial" : log.status as "completed" | "partial" | "skipped",
          phase: `Day ${log.dayNumber} - Week ${log.weekNumber} - Phase ${log.phaseNumber}`,
          workoutLogExercises: log.exercises,
          duration,
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
    
    // No logs: show nothing rather than inventing workouts.
    return [];
  }, [timePeriod, selectedDate, workoutLogs, currentMonth, currentYear]);

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
      if (isValidDate(log.logDate) && log.logDate.getTime() > 0) {
        const dateKey = `${log.logDate.getFullYear()}-${String(log.logDate.getMonth() + 1).padStart(2, "0")}-${String(log.logDate.getDate()).padStart(2, "0")}`;
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

    const days: CalendarDayCell[] = [];

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
          isSelected: false,
        });
      }
    }

    // Add days from current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
        isSelected: false,
      });
    }

    return days;
  }, [currentMonth, currentYear, selectedDate, workoutLogs]);

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

  return (
    <div className="flex flex-col gap-2">
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
                    dayData.isSelected
                      ? "bg-beshaped-dark-green text-white ring-2 ring-beshaped-dark-green ring-offset-2 ring-offset-card shadow-sm"
                      : dayData.isCurrentMonth
                      ? "hover:bg-accent hover:scale-105"
                      : "opacity-40"
                  }`}
                >
                  <span
                    className={`text-sm font-medium ${
                      dayData.isSelected
                        ? "font-bold text-white"
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
                        dayData.isSelected 
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

          {logsStatus === "loading" && (
            <p className="py-10 text-center text-sm text-muted-foreground" role="status">
              Loading workouts…
            </p>
          )}
          {logsStatus === "error" && (
            <div role="alert" className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-medium text-card-foreground">Couldn&apos;t load this client&apos;s workouts.</p>
              <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mt-4 h-9 px-4 rounded-lg bg-beshaped-dark-green text-white text-sm font-medium hover:bg-beshaped-green transition-colors"
              >
                Try again
              </button>
            </div>
          )}
          {logsStatus === "ready" && filteredWorkouts.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
              <p className="text-sm font-medium text-card-foreground">
                {workoutLogs.length === 0
                  ? "No workouts logged yet"
                  : `No workouts ${timePeriod === "day" ? "on this day" : timePeriod === "week" ? "this week" : "this month"}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {workoutLogs.length === 0
                  ? "Workouts this client completes in the app will show here."
                  : "Pick another day on the calendar, or switch to week or month."}
              </p>
            </div>
          )}

          {logsStatus === "ready" && filteredWorkouts.map((workout, index) => (
            <div key={workout.workoutLogId || index}>
              <details
                className="group rounded-xl border border-muted-foreground/25 bg-muted shadow-sm overflow-hidden"
                open={index === 0}
              >
                <summary className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-2 cursor-pointer hover:bg-accent/50 transition-colors select-none relative list-none">
                  <div className="flex items-center gap-4 min-w-[120px]  ">
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground border border-border">
                      <span className="text-xs font-bold uppercase tracking-wide">{workout.date.split(" ")[0]}</span>
                      <span className="text-xl font-bold leading-none">{workout.date.split(" ")[1]}</span>
                    </div>
                    <div>
                      <h4 className="text-card-foreground font-bold text-base">{workout.dayOfWeek}</h4>
                      <p className="text-muted-foreground text-xs">Started at: {workout.startedTime}</p>
                      <p className="text-muted-foreground text-xs">Completed at: {workout.completedTime}</p>
                      <p className="text-muted-foreground text-xs">Duration: {workout.duration ?? "--"}</p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-card-foreground font-bold text-lg">{workout.name}</h3>
                      {workout.phase && (
                        <p className="text-xs font-bold text-foreground mt-1 ">
                          {workout.phase}
                        </p>
                      )}
                      {/* {index === 0 && workout.duration && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground ">
                          <span>{workout.duration} duration</span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span>{workout.volume} vol</span>
                        </div>
                      )} */}
                    </div>
                  </div>

                  <div className="absolute right-5 top-5 md:static md:right-auto md:top-auto">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-open:rotate-90 transition-transform duration-200" />
                  </div>
                </summary>

                {/* Display exercises from workoutLogs (primary) */}
                {workout.workoutLogExercises && workout.workoutLogExercises.length > 0 ? (
                  <div className="border-t border-border bg-muted/30 p-2">
                    <div className="grid gap-3">
                      {workout.workoutLogExercises.map((exercise, exIdx) => (
                        <div key={exIdx} className="bg-card rounded-lg p-4 border border-border">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-bold text-card-foreground text-sm">
                              {exIdx + 1}. {exercise.name}
                            </h5>
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                              {exercise.sets.filter((s) => s.completed).length} / {exercise.sets.length} Sets
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                            {exercise.sets.map((set, setIdx) => (
                              <div
                                key={setIdx}
                                className={`p-2 rounded flex flex-col items-center justify-center text-center ${
                                  set.completed 
                                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
                                    : "bg-muted border border-border"
                                }`}
                              >
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">
                                  Set {set.setNumber || setIdx + 1}
                                </span>
                                {set.completed && set.weight && set.reps ? (
                                  <span className="font-bold text-card-foreground">
                                    {set.weight} x {set.reps}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">--</span>
                                )}
                                {set.completed ? (
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
