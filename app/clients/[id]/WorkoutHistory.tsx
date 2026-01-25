"use client";

import { useState } from "react";
import { Search, Filter, Download, List, Calendar, ChevronDown } from "lucide-react";

// Mock workout data
const mockWorkouts = [
  {
    id: 1,
    date: "Oct 26",
    day: "Today",
    time: "9:00 AM",
    name: "Upper Body Power",
    program: "Hypertrophy Phase 2",
    status: "completed",
    duration: "1h 15m",
    volume: "15,240 lb",
    avgRpe: "8.5",
    exercises: [
      {
        id: 1,
        name: "Barbell Bench Press",
        sets: [
          { setNum: 1, weight: "185lb", reps: 8, rpe: 7 },
          { setNum: 2, weight: "185lb", reps: 8, rpe: 8 },
          { setNum: 3, weight: "195lb", reps: 6, rpe: 9.5 },
        ],
      },
      {
        id: 2,
        name: "Incline Dumbbell Press",
        sets: [
          { setNum: 1, weight: "65lb", reps: 10, rpe: 7 },
          { setNum: 2, weight: "65lb", reps: 10, rpe: 8 },
          { setNum: 3, weight: "65lb", reps: 10, rpe: 9 },
        ],
      },
    ],
  },
  {
    id: 2,
    date: "Oct 24",
    day: "Tuesday",
    time: "5:30 PM",
    name: "Lower Body Hypertrophy",
    program: "Hypertrophy Phase 2",
    status: "completed",
    duration: "58m",
    volume: "21,050 lb",
    avgRpe: "8.0",
    exercises: [],
  },
  {
    id: 3,
    date: "Oct 22",
    day: "Sunday",
    time: "--:--",
    name: "Active Recovery",
    program: "Hypertrophy Phase 2",
    status: "skipped",
    duration: "--",
    volume: "--",
    avgRpe: "--",
    exercises: [],
  },
  {
    id: 4,
    date: "Oct 20",
    day: "Friday",
    time: "8:15 AM",
    name: "Back & Biceps",
    program: "Hypertrophy Phase 2",
    status: "partial",
    duration: "35m",
    volume: "8,400 lb",
    avgRpe: "7.0",
    exercises: [],
  },
];

const statusConfig = {
  completed: {
    label: "Completed",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  skipped: {
    label: "Skipped",
    bgColor: "bg-red-50 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-300",
  },
  partial: {
    label: "Partial",
    bgColor: "bg-orange-50 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-300",
  },
};

export default function WorkoutHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [openWorkout, setOpenWorkout] = useState<number | null>(1);

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <Search className="w-5 h-5" />
          </span>
          <input
            className="w-full h-10 pl-10 pr-4 text-sm text-card-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Search by workout name..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-accent text-card-foreground"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
              onClick={() => setViewMode("list")}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "calendar"
                  ? "bg-accent text-card-foreground"
                  : "text-muted-foreground hover:text-card-foreground"
              }`}
              onClick={() => setViewMode("calendar")}
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Workout List */}
      <div className="flex flex-col gap-4">
        {mockWorkouts.map((workout) => {
          const isOpen = openWorkout === workout.id;
          const status = statusConfig[workout.status as keyof typeof statusConfig];

          return (
            <div
              key={workout.id}
              className={`bg-card rounded-xl border border-border overflow-hidden ${
                workout.status === "skipped" ? "opacity-75 hover:opacity-100" : ""
              } transition-opacity`}
            >
              {/* Workout Summary */}
              <div
                className="flex flex-col md:flex-row items-stretch md:items-center gap-4 p-5 cursor-pointer hover:bg-accent/50 transition-colors select-none"
                onClick={() => setOpenWorkout(isOpen ? null : workout.id)}
              >
                {/* Date Badge */}
                <div className="flex items-center gap-4 min-w-[180px]">
                  <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {workout.date.split(" ")[0]}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {workout.date.split(" ")[1]}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-card-foreground font-bold text-base">{workout.day}</h4>
                    <p className="text-muted-foreground text-xs">{workout.time}</p>
                  </div>
                </div>

                {/* Workout Info */}
                <div className="flex-1 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-card-foreground font-bold text-lg">{workout.name}</h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${status.bgColor} ${status.textColor}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">• {workout.program}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 md:gap-8 mr-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Duration
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          workout.status === "skipped"
                            ? "text-muted-foreground"
                            : "text-card-foreground"
                        }`}
                      >
                        {workout.duration}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Volume
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          workout.status === "skipped"
                            ? "text-muted-foreground"
                            : "text-card-foreground"
                        }`}
                      >
                        {workout.volume}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Avg RPE
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          workout.status === "skipped"
                            ? "text-muted-foreground"
                            : "text-card-foreground"
                        }`}
                      >
                        {workout.avgRpe}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="absolute right-5 top-5 md:static md:right-auto md:top-auto">
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Workout Details (Expanded) */}
              {isOpen && (
                <div className="border-t border-border bg-muted/20 p-5">
                  {workout.exercises.length > 0 ? (
                    <div className="grid gap-4">
                      {workout.exercises.map((exercise, idx) => (
                        <div
                          key={exercise.id}
                          className="bg-card rounded-lg p-4 border border-border"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-bold text-card-foreground text-sm">
                              {idx + 1}. {exercise.name}
                            </h5>
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                              {exercise.sets.length} Sets
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 text-sm">
                            {exercise.sets.map((set) => (
                              <div
                                key={set.setNum}
                                className="p-2 bg-background rounded flex flex-col items-center justify-center text-center"
                              >
                                <span className="text-[10px] text-muted-foreground uppercase font-bold mb-0.5">
                                  Set {set.setNum}
                                </span>
                                <span className="font-bold text-card-foreground">
                                  {set.weight} x {set.reps}
                                </span>
                                <span
                                  className={`text-[10px] ${
                                    set.rpe >= 9
                                      ? "text-orange-500"
                                      : set.rpe >= 8
                                      ? "text-green-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  @ {set.rpe} RPE
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      {workout.status === "skipped"
                        ? "No data recorded."
                        : "Workout details..."}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-bold text-card-foreground">1-4</span> of{" "}
          <span className="font-bold text-card-foreground">24</span> results
        </p>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent disabled:opacity-50"
            disabled
          >
            Previous
          </button>
          <button className="px-3 py-1 text-sm font-medium text-card-foreground bg-card border border-border rounded-lg hover:bg-accent">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
