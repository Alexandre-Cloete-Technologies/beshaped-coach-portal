import type { DocumentData } from 'firebase/firestore';

/**
 * What a coach needs at a glance about a client, worked out from their real workoutLogs (never placeholders):
 * when they last trained, what's next in their current program, how far through it they are, and a status.
 */

export type ActivityStatus = 'active' | 'slipping' | 'inactive' | 'not-started' | 'no-program';

/** Days since the last completed workout at which the status changes. */
export const SLIPPING_AFTER_DAYS = 7;
export const INACTIVE_AFTER_DAYS = 14;

export type NextWorkout = {
  name: string;
  phaseNumber: number;
  weekNumber: number;
  dayNumber: number;
  /** Started in the app but not finished. */
  inProgress: boolean;
};

export type ClientActivity = {
  lastWorkoutAt: Date | null;
  nextWorkout: NextWorkout | null;
  /** Completed workouts in the current program. */
  completedInProgram: number;
  /** Workout days in the current program (0 when unknown or no program). */
  totalInProgram: number;
  status: ActivityStatus;
};

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** When a completed log was finished: `timeCompletedAt`, else the date-only `dateCompleted`. */
export function completedAt(log: DocumentData): Date | null {
  return toDate(log.timeCompletedAt) ?? toDate(log.dateCompleted);
}

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

/** Whole days between two moments, by calendar day in local time. */
export function daysBetween(earlier: Date, later: Date): number {
  const a = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate()).getTime();
  const b = new Date(later.getFullYear(), later.getMonth(), later.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function summarizeClientActivity(
  logs: DocumentData[],
  currentProgramId: string | null,
  totalWorkoutsInProgram: number,
  now: Date = new Date()
): ClientActivity {
  let lastWorkoutAt: Date | null = null;
  for (const log of logs) {
    if (log.status !== 'completed') continue;
    const at = completedAt(log);
    if (at && (!lastWorkoutAt || at > lastWorkoutAt)) lastWorkoutAt = at;
  }

  const programLogs = currentProgramId ? logs.filter((l) => l.programId === currentProgramId) : [];
  const completedInProgram = programLogs.filter((l) => l.status === 'completed').length;
  const totalInProgram = currentProgramId ? Math.max(totalWorkoutsInProgram || 0, programLogs.length) : 0;

  const open = programLogs
    .filter((l) => l.status === 'to-be-completed' || l.status === 'in-progress')
    .sort(
      (a, b) =>
        num(a.phaseNumber) - num(b.phaseNumber) ||
        num(a.weekNumber) - num(b.weekNumber) ||
        num(a.dayNumber) - num(b.dayNumber)
    );
  // A workout already started comes first; otherwise the earliest scheduled day.
  const next = open.find((l) => l.status === 'in-progress') ?? open[0];
  const nextWorkout: NextWorkout | null = next
    ? {
        name: String(next.workoutName || next.routineName || 'Workout'),
        phaseNumber: num(next.phaseNumber),
        weekNumber: num(next.weekNumber),
        dayNumber: num(next.dayNumber),
        inProgress: next.status === 'in-progress',
      }
    : null;

  let status: ActivityStatus;
  if (!currentProgramId) status = 'no-program';
  else if (!lastWorkoutAt) status = 'not-started';
  else {
    const days = daysBetween(lastWorkoutAt, now);
    status = days > INACTIVE_AFTER_DAYS ? 'inactive' : days > SLIPPING_AFTER_DAYS ? 'slipping' : 'active';
  }

  return { lastWorkoutAt, nextWorkout, completedInProgram, totalInProgram, status };
}

/** "Today", "Yesterday", "3 days ago", or a date for anything older than two weeks. */
export function formatLastWorkout(at: Date | null, now: Date = new Date()): string {
  if (!at) return 'Never';
  const days = daysBetween(at, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days <= INACTIVE_AFTER_DAYS) return `${days} days ago`;
  return at.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: at.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
