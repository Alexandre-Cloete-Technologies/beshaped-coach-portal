"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface NutritionProps {
  clientId: string;
}

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

interface NutritionLog {
  id: string;
  meal: string;
  eatenAt: Date;
  date: string;
  notes: string | null;
  photoUrl: string;
}

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_PILL: Record<MealType, string> = {
  breakfast: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  lunch: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  dinner: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  snack: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function toDateValue(value: unknown): Date {
  if (value == null) return new Date(0);
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

/** Local calendar day as YYYY-MM-DD, matching the `date` field written by the client app. */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isMealType(value: string): value is MealType {
  return (MEAL_ORDER as string[]).includes(value);
}

function mealLabel(meal: string): string {
  return isMealType(meal) ? MEAL_LABEL[meal] : meal;
}

function formatEatenAt(date: Date): string {
  if (date.getTime() <= 0) return "Time unknown";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatHeading(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isMissingIndex(err: unknown): boolean {
  if (err instanceof FirebaseError) return err.code === "failed-precondition";
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "failed-precondition"
  );
}

function mapNutritionLog(docSnap: QueryDocumentSnapshot): NutritionLog {
  const data = docSnap.data() as Record<string, unknown>;
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  return {
    id: docSnap.id,
    meal: typeof data.meal === "string" ? data.meal : "",
    eatenAt: toDateValue(data.eatenAt),
    date: typeof data.date === "string" ? data.date : "",
    notes: notes.length > 0 ? notes : null,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl.trim() : "",
  };
}

function sortLogs(logs: NutritionLog[]): NutritionLog[] {
  return [...logs].sort(
    (a, b) => a.eatenAt.getTime() - b.eatenAt.getTime() || a.id.localeCompare(b.id)
  );
}

/**
 * Day feed: userId (Auth uid) + date. If the composite index is not ready,
 * fall back to userId-only and filter the date in memory.
 */
async function fetchNutritionLogs(userId: string, dateKey: string): Promise<NutritionLog[]> {
  const logsRef = collection(db, "nutritionLogs");
  try {
    const snapshot = await getDocs(
      query(logsRef, where("userId", "==", userId), where("date", "==", dateKey))
    );
    return sortLogs(snapshot.docs.map(mapNutritionLog));
  } catch (err) {
    if (!isMissingIndex(err)) throw err;
    console.warn(
      "nutritionLogs userId+date index is not ready; filtering this client's logs in memory."
    );
    const snapshot = await getDocs(query(logsRef, where("userId", "==", userId)));
    return sortLogs(
      snapshot.docs.map(mapNutritionLog).filter((log) => log.date === dateKey)
    );
  }
}

interface MealSection {
  meal: string;
  logs: NutritionLog[];
}

function buildSections(logs: NutritionLog[]): MealSection[] {
  const byMeal = new Map<string, NutritionLog[]>();
  for (const log of logs) {
    const key = log.meal || "other";
    const list = byMeal.get(key) ?? [];
    list.push(log);
    byMeal.set(key, list);
  }

  const sections: MealSection[] = MEAL_ORDER.filter(
    (meal) => meal !== "snack" || (byMeal.get("snack")?.length ?? 0) > 0
  ).map((meal) => ({
    meal,
    logs: byMeal.get(meal) ?? [],
  }));

  for (const [meal, mealLogs] of byMeal) {
    if (!isMealType(meal)) {
      sections.push({ meal, logs: mealLogs });
    }
  }

  return sections;
}

export default function Nutrition({ clientId }: NutritionProps) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [selectedDate, setSelectedDate] = useState(today);
  // Result of the last fetch, tagged with the client/day it was for; anything else is still loading.
  const [result, setResult] = useState<{
    key: string;
    logs: NutritionLog[];
    error: string | null;
  } | null>(null);
  const [selectedLog, setSelectedLog] = useState<NutritionLog | null>(null);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(new Set());

  const dateKey = formatDateKey(selectedDate);
  const isToday = dateKey === formatDateKey(today);
  const requestKey = `${clientId}|${dateKey}`;
  const loading = result?.key !== requestKey;
  const logs = !loading && result ? result.logs : [];
  const error = !loading && result ? result.error : null;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    const key = `${clientId}|${dateKey}`;

    fetchNutritionLogs(clientId, dateKey)
      .then((nextLogs) => {
        if (!cancelled) setResult({ key, logs: nextLogs, error: null });
      })
      .catch((err) => {
        console.error("Error fetching nutrition logs:", err);
        if (!cancelled) setResult({ key, logs: [], error: "Couldn’t load meal photos for this day." });
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, dateKey]);

  useEffect(() => {
    if (!selectedLog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedLog(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLog]);

  const sections = useMemo(() => buildSections(logs), [logs]);
  const photoCount = logs.length;

  const markPhotoFailed = (id: string) => {
    setFailedPhotos((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Meal photos</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {loading
                  ? "Loading this day…"
                  : photoCount === 0
                    ? "No photos logged"
                    : `${photoCount} photo${photoCount === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate((date) => addDays(date, -1))}
                className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <input
                type="date"
                value={dateKey}
                onChange={(event) => {
                  if (!event.target.value) return;
                  setSelectedDate(parseDateKey(event.target.value));
                }}
                className="h-9 px-3 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-card-foreground"
                aria-label="Select day"
              />
              <button
                type="button"
                onClick={() => setSelectedDate((date) => addDays(date, 1))}
                className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
                aria-label="Next day"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  className="h-9 px-3 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors text-foreground"
                >
                  Today
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">{formatHeading(selectedDate)}</p>
        </div>

        {error && (
          <div className="bg-card rounded-xl border border-red-200 dark:border-red-900 p-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-10 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-3" />
            <p className="text-sm text-muted-foreground">Loading meal photos…</p>
          </div>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-4">
            {sections.map((section) => {
              const pill = isMealType(section.meal) ? MEAL_PILL[section.meal] : "bg-muted text-foreground";
              return (
                <section
                  key={section.meal}
                  className="bg-card rounded-xl border border-border shadow-sm p-5"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded ${pill}`}>
                        {mealLabel(section.meal)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {section.logs.length === 0
                        ? "No photos"
                        : `${section.logs.length} photo${section.logs.length === 1 ? "" : "s"}`}
                    </span>
                  </div>

                  {section.logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No photos logged for this meal.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {section.logs.map((log) => {
                        const showPhoto = log.photoUrl.length > 0 && !failedPhotos.has(log.id);
                        return (
                          <article
                            key={log.id}
                            className="rounded-xl border border-border overflow-hidden bg-muted/30"
                          >
                            <button
                              type="button"
                              className="relative block w-full aspect-[4/5] bg-muted"
                              onClick={() => setSelectedLog(log)}
                              aria-label={`Open ${mealLabel(section.meal)} photo from ${formatEatenAt(log.eatenAt)}`}
                            >
                              {showPhoto ? (
                                <Image
                                  src={log.photoUrl}
                                  alt={`${mealLabel(section.meal)} at ${formatEatenAt(log.eatenAt)}`}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
                                  onError={() => markPhotoFailed(log.id)}
                                />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                                  Photo unavailable
                                </span>
                              )}
                            </button>
                            <div className="p-3">
                              <p className="text-sm font-semibold text-foreground">
                                {formatEatenAt(log.eatenAt)}
                              </p>
                              {log.notes && (
                                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                                  {log.notes}
                                </p>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="relative w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
              onClick={() => setSelectedLog(null)}
              aria-label="Close photo"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="relative w-full h-[min(75vh,820px)] bg-black rounded-lg overflow-hidden">
              {selectedLog.photoUrl && !failedPhotos.has(selectedLog.id) ? (
                <Image
                  src={selectedLog.photoUrl}
                  alt={`${mealLabel(selectedLog.meal)} at ${formatEatenAt(selectedLog.eatenAt)}`}
                  fill
                  unoptimized
                  className="object-contain"
                  onError={() => markPhotoFailed(selectedLog.id)}
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
                  Photo unavailable
                </span>
              )}
            </div>
            <div className="mt-3 text-white">
              <p className="text-sm font-semibold">
                {mealLabel(selectedLog.meal)} · {formatEatenAt(selectedLog.eatenAt)}
              </p>
              {selectedLog.notes && (
                <p className="mt-1 text-sm text-white/80 whitespace-pre-wrap">{selectedLog.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
