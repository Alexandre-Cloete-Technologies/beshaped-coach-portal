"use client";

import { ChevronLeft, ChevronRight, Search, Filter, Download, List, LayoutGrid } from "lucide-react";
import { useState, useMemo } from "react";

interface WorkoutSet {
  setNumber: number;
  weight: string;
  reps: number;
  rpe: number;
}

interface Exercise {
  name: string;
  sets: WorkoutSet[];
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
  phase?: string;
}

const mockWorkouts: Workout[] = [
  {
    date: "Oct 26",
    dayOfWeek: "Thursday",
    time: "9:00 AM",
    name: "Upper Body Power",
    status: "completed",
    duration: "1h 15m",
    volume: "15,240 lb",
    avgRpe: 8.5,
    phase: "Hypertrophy Phase 2 - Week 3",
    exercises: [
      {
        name: "Barbell Bench Press",
        sets: [
          { setNumber: 1, weight: "185lb", reps: 8, rpe: 7 },
          { setNumber: 2, weight: "185lb", reps: 8, rpe: 8 },
          { setNumber: 3, weight: "195lb", reps: 6, rpe: 9.5 },
        ],
      },
      {
        name: "Incline Dumbbell Press",
        sets: [
          { setNumber: 1, weight: "65lb", reps: 10, rpe: 7 },
          { setNumber: 2, weight: "65lb", reps: 10, rpe: 8 },
          { setNumber: 3, weight: "65lb", reps: 10, rpe: 9 },
        ],
      },
      {
        name: "Weighted Pull-ups",
        sets: [
          { setNumber: 1, weight: "BW+25lb", reps: 8, rpe: 7 },
          { setNumber: 2, weight: "BW+25lb", reps: 8, rpe: 8 },
          { setNumber: 3, weight: "BW+25lb", reps: 7, rpe: 9 },
          { setNumber: 4, weight: "BW", reps: 10, rpe: 8 },
        ],
      },
    ],
  },
  {
    date: "Oct 24",
    dayOfWeek: "Tuesday",
    time: "5:30 PM",
    name: "Lower Body Hypertrophy",
    status: "completed",
    avgRpe: 8.0,
  },
  {
    date: "Oct 22",
    dayOfWeek: "Sunday",
    time: "--:--",
    name: "Active Recovery",
    status: "skipped",
  },
];

// Mock workout status data - in real app, this would come from your database
const mockWorkoutStatus: Record<string, "completed" | "partial" | "skipped"> = {
  "2023-10-01": "completed",
  "2023-10-02": "completed",
  "2023-10-03": "partial",
  "2023-10-04": "completed",
  "2023-10-05": "skipped",
  "2023-10-07": "completed",
  "2023-10-08": "completed",
  "2023-10-09": "completed",
  "2023-10-10": "partial",
  "2023-10-11": "completed",
  "2023-10-12": "completed",
  "2023-10-14": "completed",
  "2023-10-15": "completed",
  "2023-10-16": "completed",
  "2023-10-17": "partial",
  "2023-10-18": "completed",
  "2023-10-19": "completed",
  "2023-10-20": "completed",
  "2023-10-22": "skipped",
  "2023-10-23": "completed",
  "2023-10-24": "completed",
  "2023-10-25": "completed",
  "2023-10-26": "completed",
};

export default function WorkoutHistory() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [expandedWorkout, setExpandedWorkout] = useState<number>(0);
  
  // Calendar state
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today); // Default to today
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month">("month");

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

  // Generate year options (current year ± 5 years)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = -5; i <= 2; i++) {
      years.push(today.getFullYear() + i);
    }
    return years;
  }, [today]);

  // Filter workouts based on selected time period
  const filteredWorkouts = useMemo(() => {
    if (timePeriod === "month") {
      // Show all workouts for the current month
      return mockWorkouts;
    } else if (timePeriod === "week" && selectedDate) {
      // Show workouts for the selected week
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      return mockWorkouts.filter((workout) => {
        // In real app, you'd parse workout.date properly
        // For now, return all for demonstration
        return true;
      });
    } else if (timePeriod === "day" && selectedDate) {
      // Show workouts for the selected day
      return mockWorkouts.filter((workout) => {
        // In real app, compare workout date with selectedDate
        // For now, return first workout for demonstration
        return workout === mockWorkouts[0];
      });
    }
    return mockWorkouts;
  }, [timePeriod, selectedDate]);

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
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    const days: Array<{
      day: number;
      isCurrentMonth: boolean;
      isPreviousMonth: boolean;
      isNextMonth: boolean;
      date: Date;
      status: "completed" | "partial" | "skipped" | null;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Add days from previous month
    if (startingDayOfWeek > 0) {
      const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = new Date(currentYear, currentMonth - 1, day);
        days.push({
          day,
          isCurrentMonth: false,
          isPreviousMonth: true,
          isNextMonth: false,
          date,
          status: null,
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

      days.push({
        day,
        isCurrentMonth: true,
        isPreviousMonth: false,
        isNextMonth: false,
        date,
        status: mockWorkoutStatus[dateKey] || null,
        isToday,
        isSelected,
      });
    }

    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      days.push({
        day,
        isCurrentMonth: false,
        isPreviousMonth: false,
        isNextMonth: true,
        date,
        status: null,
        isToday: false,
        isSelected: false,
      });
    }

    return days;
  }, [currentMonth, currentYear, today, selectedDate]);

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
    if (status === "partial") return "bg-orange-500";
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
          <button className="flex items-center gap-2 px-4 h-10 text-sm font-semibold text-card-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 h-10 text-sm font-semibold text-card-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <div className="flex bg-card border border-border rounded-lg p-1 h-10 items-center">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list" ? "bg-accent text-card-foreground" : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "calendar" ? "bg-accent text-card-foreground" : "text-muted-foreground hover:text-card-foreground"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
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
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
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
                      className={`h-1.5 w-1.5 rounded-full mt-1 ${
                        dayData.isToday || dayData.isSelected ? "bg-white" : getStatusDotColor(dayData.status)
                      }`}
                    ></span>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
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
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="bg-card rounded-xl border border-border p-6">
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
          </div>
        </div>

        {/* Right Content - Workout List */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold text-card-foreground">{getWorkoutListTitle()}</h3>
            {timePeriod === "month" && (
              <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                Hypertrophy Phase 2 - Week 3
              </span>
            )}
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
                    {index === 0 ? (
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground border border-border">
                        <span className="text-xs font-bold uppercase tracking-wide">{workout.date.split(" ")[0]}</span>
                        <span className="text-xl font-bold leading-none">{workout.date.split(" ")[1]}</span>
                      </div>
                    )}
                    <div>
                      {index === 0 ? (
                        <>
                          <p className="text-muted-foreground text-xs">{workout.time}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold uppercase tracking-wide text-green-600 dark:text-green-400">
                              DONE
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="text-card-foreground font-bold text-base">{workout.dayOfWeek}</h4>
                          <p className="text-muted-foreground text-xs">{workout.time}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-card-foreground font-bold text-lg">{workout.name}</h3>
                      {index === 0 && workout.duration && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{workout.duration} duration</span>
                          <span className="w-1 h-1 rounded-full bg-border"></span>
                          <span>{workout.volume} vol</span>
                        </div>
                      )}
                      {index !== 0 && <div className="flex items-center gap-2">{getStatusBadge(workout.status)}</div>}
                    </div>
                    <div className="flex items-center gap-6 mr-8">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Avg RPE
                        </span>
                        <span className="text-lg font-bold text-card-foreground">
                          {workout.avgRpe ? workout.avgRpe.toFixed(1) : "--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-5 top-5 md:static md:right-auto md:top-auto">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-open:rotate-90 transition-transform duration-200" />
                  </div>
                </summary>

                {workout.exercises ? (
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
                    <p className="text-muted-foreground text-sm italic">
                      {workout.status === "skipped" ? "No data recorded." : "Workout details..."}
                    </p>
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
