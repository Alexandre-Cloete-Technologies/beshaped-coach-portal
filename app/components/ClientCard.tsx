"use client";

import { ArrowRight, AlertTriangle, Check, Target } from "lucide-react";

export interface ClientData {
  id: string;
  name: string;
  photo: string;
  avatarGradient?: string;
  currentProgram: string;
  week: number;
  totalWeeks: number;
  currentDay?: number;
  currentPhase?: number;
  compliance: number;
  totalWorkouts: number;
  completedWorkouts: number;
  totalWorkoutsInProgram?: number;
  weight: number;
  weightChange: number;
  lastWorkout: string;
  status: "high" | "medium" | "low" | "critical" | "perfect";
  todayWorkout?: {
    name: string;
    exercisesCompleted: number;
    totalExercises: number;
  };
  nextWorkout: string;
  goals?: string;
}

const statusColors = {
  high: { ring: "text-emerald-500", dot: "bg-emerald-500", label: "High", labelColor: "text-emerald-600" },
  medium: { ring: "text-amber-500", dot: "bg-amber-500", label: "Medium", labelColor: "text-amber-600" },
  low: { ring: "text-red-400", dot: "bg-red-400", label: "Low", labelColor: "text-red-500" },
  critical: { ring: "text-red-500", dot: "bg-red-500", label: "Critical", labelColor: "text-red-600" },
  perfect: { ring: "text-emerald-500", dot: "bg-emerald-500", label: "Perfect", labelColor: "text-emerald-600" },
};

interface CircularProgressProps {
  percentage: number;
  status: keyof typeof statusColors;
}

function CircularProgress({ percentage, status }: CircularProgressProps) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const colors = statusColors[status];

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
        {/* Background circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={colors.ring}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-card-foreground">{percentage}%</span>
      </div>
    </div>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100;
  
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(percentage)}%</span>
    </div>
  );
}

export default function ClientCard({ client }: { client: ClientData }) {
  const colors = statusColors[client.status];
  const isAlert = client.status === "low" || client.status === "critical";
  const programProgress = Math.round((client.week / client.totalWeeks) * 100);

  const formatLastWorkout = (lastWorkout: string) => {
    if (lastWorkout === "Today") return <span className="flex items-center gap-1">Today <Check className="w-3 h-3 text-emerald-500" /></span>;
    if (lastWorkout === "Yesterday") return "Yesterday";
    return <span className="text-red-500">{lastWorkout}</span>;
  };

  // Format program info with phase, day, and week
  const formatProgramInfo = () => {
    const parts = [];
    if (client.currentPhase) parts.push(`Phase ${client.currentPhase}`);
    if (client.currentDay) parts.push(`Day ${client.currentDay}`);
    parts.push(`Week ${client.week}`);
    return `${client.currentProgram} • ${parts.join(' ')}`;
  };

  return (
    <div 
      className={`bg-card rounded-2xl border ${isAlert ? 'border-red-300 dark:border-red-800 shadow-red-100 dark:shadow-red-900/20' : 'border-border'} p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4`}
    >
      {/* Header: Photo, Name, Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full ${client.avatarGradient || 'bg-gradient-to-br from-blue-400 to-blue-600'} overflow-hidden flex-shrink-0 flex items-center justify-center`}>
            <span className="text-white text-sm font-semibold">
              {client.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">{client.name}</h3>
            <p className="text-xs text-muted-foreground">
              {formatProgramInfo()}
            </p>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
      </div>

      {/* Main Content: Circular Progress + Stats */}
      <div className="flex gap-4">
        <CircularProgress percentage={client.compliance} status={client.status} />
        
        <div className="flex-1 space-y-2">
          {/* Program Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Program Progress</span>
            </div>
            <div className="text-xs text-muted-foreground mb-1">
              Week {client.totalWorkouts} of {client.totalWorkoutsInProgram || 0}
            </div>
            <ProgressBar current={client.totalWorkouts} total={client.totalWorkoutsInProgram || 1} />
          </div>

          {/* Stats */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bodyweight</span>
              <span className="font-medium text-card-foreground">
                {client.weight} kg 
                {client.weightChange !== 0 && (
                  <span className={client.weightChange < 0 ? "text-emerald-500" : "text-red-500"}>
                    {" "}({client.weightChange > 0 ? "+" : ""}{client.weightChange} kg)
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Workout</span>
              <span className="font-medium text-card-foreground">{formatLastWorkout(client.lastWorkout)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Compliance</span>
              <span className={`font-medium ${colors.labelColor}`}>
                {client.completedWorkouts}/{client.totalWorkouts} ({client.compliance}%)
              </span>
            </div>
            {client.goals && (
              <div className="flex items-start gap-1.5 pt-1">
                <Target className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Goals: </span>
                  <span className="font-medium text-card-foreground">{client.goals}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Workout Box */}
      {client.todayWorkout && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-card-foreground">
              TODAY: {client.todayWorkout.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Progress:</span>
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(client.todayWorkout.exercisesCompleted / client.todayWorkout.totalExercises) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {client.todayWorkout.exercisesCompleted}/{client.todayWorkout.totalExercises} exercises
            </span>
          </div>
        </div>
      )}

      {/* Footer: Next Workout or Alert */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        {isAlert ? (
          <button className="flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-600 transition-colors">
            <AlertTriangle className="w-4 h-4" />
            NUDGE CLIENT
          </button>
        ) : (
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            NEXT: {client.nextWorkout}
          </span>
        )}
        <button className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
