import { Meal, NutritionPlan, newId } from "./foods";

// Browser-only storage until the nutrition plan shape is agreed across repos (see /schema-change).
const PLANS_STORAGE_KEY = "beshaped:nutrition-plans";
const LEGACY_DRAFT_KEY = "beshaped:nutrition-plan-draft";

export const UNTITLED_PLAN = "Untitled plan";

export interface StoredPlan extends NutritionPlan {
  id: string;
  createdAt: string;
  updatedAt: string;
}

function isMealArray(value: unknown): value is Meal[] {
  return Array.isArray(value);
}

function readAll(): StoredPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const plans = Array.isArray(parsed) ? (parsed as StoredPlan[]) : [];
    return migrateLegacyDraft(plans);
  } catch {
    return [];
  }
}

function writeAll(plans: StoredPlan[]) {
  localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
}

/** The first version kept a single autosaved draft; fold it into the plan list once. */
function migrateLegacyDraft(plans: StoredPlan[]): StoredPlan[] {
  const raw = localStorage.getItem(LEGACY_DRAFT_KEY);
  if (!raw) return plans;
  localStorage.removeItem(LEGACY_DRAFT_KEY);
  try {
    const draft = JSON.parse(raw) as Partial<NutritionPlan>;
    if (!isMealArray(draft.meals) || draft.meals.length === 0) return plans;
    const now = new Date().toISOString();
    const migrated: StoredPlan = {
      id: newId(),
      name: draft.name?.trim() || UNTITLED_PLAN,
      meals: draft.meals,
      notes: draft.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
    const next = [migrated, ...plans];
    writeAll(next);
    return next;
  } catch {
    return plans;
  }
}

export function listPlans(): StoredPlan[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPlan(id: string): StoredPlan | undefined {
  return readAll().find((p) => p.id === id);
}

export function savePlan(plan: NutritionPlan & { id?: string }): StoredPlan {
  const plans = readAll();
  const now = new Date().toISOString();
  const existing = plan.id ? plans.find((p) => p.id === plan.id) : undefined;
  const saved: StoredPlan = {
    id: existing?.id ?? plan.id ?? newId(),
    name: plan.name.trim() || UNTITLED_PLAN,
    meals: plan.meals,
    notes: plan.notes ?? "",
    goals: plan.goals,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeAll(existing ? plans.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...plans]);
  return saved;
}

export function deletePlan(id: string) {
  writeAll(readAll().filter((p) => p.id !== id));
}

/** Puts a previously deleted plan back exactly as it was (used by Undo). */
export function restorePlan(plan: StoredPlan) {
  const plans = readAll().filter((p) => p.id !== plan.id);
  writeAll([plan, ...plans]);
}

export function duplicatePlan(id: string, copySuffix = "copy"): StoredPlan | undefined {
  const source = getPlan(id);
  if (!source) return undefined;
  const meals: Meal[] = source.meals.map((m) => ({
    ...m,
    id: newId(),
    items: m.items.map((it) => ({ ...it, id: newId() })),
  }));
  return savePlan({ name: `${source.name} (${copySuffix})`, meals, notes: source.notes, goals: source.goals });
}

export function formatUpdated(iso: string, locale: "en" | "af" = "en", justNow = "just now"): string {
  const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "af" ? "af" : "en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSec) >= seconds) return rtf.format(Math.round(diffSec / seconds), unit);
  }
  return justNow;
}
