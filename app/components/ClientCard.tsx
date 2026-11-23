"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatLastWorkout, type ActivityStatus, type ClientActivity } from "@/lib/clientActivity";

export interface ClientData {
  id: string;
  name: string;
  photo: string;
  avatarGradient?: string;
  currentProgram: string;
  /** From the client's workoutLogs (lib/clientActivity.ts). */
  activity: ClientActivity;
  weight: number | null;
  weightUnit?: string;
  /** `null` if fewer than two weigh-ins (no previous entry to compare). */
  weightChange: number | null;
  goals?: string;
}

const STATUS_META: Record<ActivityStatus, { label: string; dot: string; text: string; hint: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", hint: "Trained in the last 7 days" },
  slipping: { label: "Slipping", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", hint: "Last trained 8–14 days ago" },
  inactive: { label: "Inactive", dot: "bg-red-500", text: "text-red-600 dark:text-red-400", hint: "No workout in over 14 days" },
  "not-started": { label: "Not started", dot: "bg-gray-400", text: "text-muted-foreground", hint: "Has a program but no completed workouts yet" },
  "no-program": { label: "No program", dot: "bg-gray-300 dark:bg-gray-600", text: "text-muted-foreground", hint: "No program assigned" },
};

interface ProgressBarProps {
  current: number;
  total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  
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

const AVATAR_PX = 44;

export default function ClientCard({ client }: { client: ClientData }) {
  const router = useRouter();
  // The URL that failed to load; a new photo URL gets a fresh attempt.
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const photoUrl = client.photo?.trim() ?? "";
  const showProfileImage = photoUrl.length > 0 && failedPhotoUrl !== photoUrl;

  const { activity } = client;
  const statusMeta = STATUS_META[activity.status];

  // Program name, and where the client is in it (from their next open workout day)
  const formatProgramInfo = () => {
    const next = activity.nextWorkout;
    if (!next) return client.currentProgram;
    return `${client.currentProgram} • Phase ${next.phaseNumber} · Week ${next.weekNumber} · Day ${next.dayNumber}`;
  };
  const isAlert = activity.status === "inactive";

  return (
    <div 
      onClick={() => router.push(`/clients/${client.id}`)}
      className={`bg-card rounded-2xl border ${isAlert ? 'border-red-300 dark:border-red-800 shadow-red-100 dark:shadow-red-900/20' : 'border-border'} p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 cursor-pointer`}
    >
      {/* Header: Photo, Name, Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`relative w-11 h-11 rounded-full flex-shrink-0 overflow-hidden ${
              showProfileImage
                ? "bg-muted"
                : `${client.avatarGradient || "bg-gradient-to-br from-blue-400 to-blue-600"} flex items-center justify-center`
            }`}
          >
            {showProfileImage ? (
              <Image
                src={photoUrl}
                alt={`${client.name} profile photo`}
                width={AVATAR_PX}
                height={AVATAR_PX}
                className="h-full w-full object-cover"
                onError={() => setFailedPhotoUrl(photoUrl)}
                unoptimized
              />
            ) : (
              <span className="text-white text-sm font-semibold">
                {client.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-card-foreground">{client.name}</h3>
            <p className="text-xs text-muted-foreground">
              {formatProgramInfo()}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${statusMeta.text}`}
          title={statusMeta.hint}
        >
          <span className={`w-2 h-2 rounded-full ${statusMeta.dot}`} />
          {statusMeta.label}
        </span>
      </div>

      {/* Main Content: Program progress + Stats */}
      <div className="flex gap-4">
        
        <div className="flex-1 space-y-2">
          {/* Program Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Program Progress</span>
            </div>
            {activity.totalInProgram > 0 ? (
              <>
                <div className="text-xs text-muted-foreground mb-1">
                  {activity.completedInProgram} of {activity.totalInProgram} workouts done
                </div>
                <ProgressBar current={activity.completedInProgram} total={activity.totalInProgram} />
              </>
            ) : (
              <div className="text-xs text-muted-foreground mb-1">No program assigned</div>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Last workout</span>
              <span className="font-medium text-card-foreground">{formatLastWorkout(activity.lastWorkoutAt)}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Next workout</span>
              <span className="font-medium text-card-foreground text-right">
                {activity.nextWorkout
                  ? `${activity.nextWorkout.inProgress ? "In progress: " : ""}${activity.nextWorkout.name}`
                  : activity.status === "no-program"
                    ? "—"
                    : "Program complete"}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Current body weight</span>
              <span className="font-medium text-card-foreground tabular-nums">
                {client.weight !== null
                  ? `${client.weight} ${client.weightUnit || "kg"}`
                  : "—"}
              </span>
            </div>
            {client.goals && (
              <div className="flex items-start">
                <div className="flex-1">
                  <span className="text-muted-foreground">Goals: </span>
                  <span className="font-medium text-card-foreground">{client.goals}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2 border-t border-border pt-3 -mx-5 -mb-5 px-5 pb-5 mt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/clients/${client.id}?tab=workout-history`}
          className="rounded-none border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground transition-colors hover:border-beshaped-dark-green hover:bg-beshaped-dark-green hover:text-white"
        >
          Workout History
        </Link>
        <Link
          href={`/clients/${client.id}?tab=progress`}
          className="rounded-none border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground transition-colors hover:border-beshaped-dark-green hover:bg-beshaped-dark-green hover:text-white"
        >
          Progress
        </Link>
        <Link
          href={`/clients/${client.id}?tab=programs`}
          className="rounded-none border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground transition-colors hover:border-beshaped-dark-green hover:bg-beshaped-dark-green hover:text-white"
        >
          Programs
        </Link>
      </div>

    </div>
  );
}
