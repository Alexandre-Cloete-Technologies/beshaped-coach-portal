"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLastWorkout, type ClientActivity } from "@/lib/clientActivity";

/** The card's three quick links: small outline buttons, a step less rounded than the card. */
const cardLinkClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-sm font-normal shadow-none");

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
          className="h-full bg-primary rounded-full transition-all"
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

  // Program name, and where the client is in it (from their next open workout day)
  const formatProgramInfo = () => {
    const next = activity.nextWorkout;
    if (!next) return client.currentProgram;
    return `${client.currentProgram} • Phase ${next.phaseNumber} · Week ${next.weekNumber} · Day ${next.dayNumber}`;
  };

  return (
    <div 
      onClick={() => router.push(`/clients/${client.id}`)}
      className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 cursor-pointer"
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
      </div>

      {/* Main Content: Program progress + Stats */}
      <div className="flex gap-4">
        
        <div className="flex-1 space-y-2">
          {/* Program Progress */}
          <div>
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
              <span className="text-card-foreground">{formatLastWorkout(activity.lastWorkoutAt)}</span>
            </div>
            <div className="flex justify-between items-start gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Next workout</span>
              <span className="text-card-foreground text-right">
                {activity.nextWorkout
                  ? `${activity.nextWorkout.inProgress ? "In progress: " : ""}${activity.nextWorkout.name}`
                  : activity.totalInProgram > 0
                    ? "Program complete"
                    : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground">Current body weight</span>
              <span className="text-card-foreground tabular-nums">
                {client.weight !== null
                  ? `${client.weight} ${client.weightUnit || "kg"}`
                  : "—"}
              </span>
            </div>
            {client.goals && (
              <div className="flex items-start">
                <div className="flex-1">
                  <span className="text-muted-foreground">Goals: </span>
                  <span className="text-card-foreground">{client.goals}</span>
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
          className={cardLinkClass}
        >
          Workout History
        </Link>
        <Link
          href={`/clients/${client.id}?tab=progress`}
          className={cardLinkClass}
        >
          Progress
        </Link>
        <Link
          href={`/clients/${client.id}?tab=programs`}
          className={cardLinkClass}
        >
          Programs
        </Link>
      </div>

    </div>
  );
}
