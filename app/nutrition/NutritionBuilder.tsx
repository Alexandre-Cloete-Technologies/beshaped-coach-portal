"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Plus, UtensilsCrossed } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import Breadcrumbs from "../components/Breadcrumbs";
import MealCard from "./components/MealCard";
import MacroSummary from "./components/MacroSummary";
import MacroPie from "./components/MacroPie";
import Toast, { useToast } from "./components/Toast";
import {
  MACRO_META,
  MacroGoals,
  MacroKey,
  Meal,
  NutritionPlan,
  formatGrams,
  formatKcal,
  macroGoalIsSet,
  macroGoalShares,
  macrosForMeal,
  newId,
  sumMacros,
} from "./lib/foods";
import { getPlan, savePlan } from "./lib/planStore";

const snapshotOf = (p: NutritionPlan) =>
  JSON.stringify({ name: p.name, meals: p.meals, notes: p.notes ?? "", goals: p.goals ?? {} });

interface InitialState {
  plan: NutritionPlan;
  snapshot: string;
  notFound: boolean;
}

function loadInitial(planId?: string): InitialState {
  const empty: NutritionPlan = { name: "", meals: [], notes: "" };
  if (!planId) return { plan: empty, snapshot: snapshotOf(empty), notFound: false };
  const stored = getPlan(planId);
  if (!stored) return { plan: empty, snapshot: snapshotOf(empty), notFound: true };
  const plan = { name: stored.name, meals: stored.meals, notes: stored.notes ?? "", goals: stored.goals };
  return { plan, snapshot: snapshotOf(plan), notFound: false };
}

/** Client-only (reads localStorage on first render); load via next/dynamic with ssr: false. */
export default function NutritionBuilder({ planId: initialPlanId }: { planId?: string }) {
  const [initial] = useState(() => loadInitial(initialPlanId));
  const [planId, setPlanId] = useState(initialPlanId);
  const [plan, setPlan] = useState<NutritionPlan>(initial.plan);
  const [savedSnapshot, setSavedSnapshot] = useState(initial.snapshot);
  const [saving, setSaving] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const copy = useMessages().nutrition;
  const mealSuggestions = [1, 2, 3, 4].map((n) => copy.mealNumber(n));
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const isNew = !planId;
  const isDirty = snapshotOf(plan) !== savedSnapshot;
  const totals = useMemo(() => sumMacros(plan.meals.map(macrosForMeal)), [plan.meals]);

  const save = () => {
    if (saving || !isDirty) return;
    setSaving(true);
    try {
      const saved = savePlan({ ...plan, name: plan.name.trim() || copy.untitled, id: planId });
      const next = { name: saved.name, meals: saved.meals, notes: saved.notes ?? "", goals: saved.goals };
      setPlan(next);
      setSavedSnapshot(snapshotOf(next));
      if (!planId) {
        setPlanId(saved.id);
        window.history.replaceState(null, "", `/nutrition/${saved.id}`);
      }
      showToast({ message: isNew ? copy.planCreated : copy.changesSaved });
    } catch (error) {
      console.error("Error saving nutrition plan:", error);
      showToast({ message: copy.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const openNotes = () => {
    setNotesDraft(plan.notes ?? "");
    setNotesOpen(true);
  };

  const closeNotes = () => setNotesOpen(false);

  const saveNotes = () => {
    setPlan((p) => ({ ...p, notes: notesDraft }));
    setNotesOpen(false);
  };

  useEffect(() => {
    if (!notesOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeNotes();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notesOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    // Client-side <Link> navigation doesn't fire beforeunload, so intercept link clicks too.
    const onLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      if (!window.confirm(copy.leaveWarning)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, [isDirty, copy.leaveWarning]);

  const nextMealName = () => {
    const used = new Set(plan.meals.map((m) => m.name));
    let n = 1;
    while (used.has(copy.mealNumber(n))) n += 1;
    return copy.mealNumber(n);
  };

  const addMeal = (name = nextMealName()) =>
    setPlan((p) => ({ ...p, meals: [...p.meals, { id: newId(), name, items: [] }] }));

  const updateMeal = (meal: Meal) =>
    setPlan((p) => ({ ...p, meals: p.meals.map((m) => (m.id === meal.id ? meal : m)) }));

  const deleteMeal = (mealId: string) => {
    const index = plan.meals.findIndex((m) => m.id === mealId);
    if (index === -1) return;
    const removed = plan.meals[index];
    setPlan((p) => ({ ...p, meals: p.meals.filter((m) => m.id !== mealId) }));
    showToast({
      message: copy.deletedNamed(removed.name || copy.mealFallback),
      action: {
        label: copy.undo,
        onClick: () =>
          setPlan((p) => {
            const meals = [...p.meals];
            meals.splice(Math.min(index, meals.length), 0, removed);
            return { ...p, meals };
          }),
      },
    });
  };

  if (initial.notFound) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <Breadcrumbs items={[{ label: copy.title, href: "/nutrition" }, { label: copy.notFound }]} />
        <div className="mt-6 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-card-foreground">{copy.missingTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.missingHint}</p>
          <Link
            href="/nutrition"
            className="mt-6 inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {copy.backToPlans}
          </Link>
        </div>
      </div>
    );
  }

  const hasMeals = plan.meals.length > 0;
  const status = saving ? copy.saving : isDirty ? copy.unsaved : isNew ? copy.notSavedYet : copy.allSaved;

  return (
    <>
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumbs
              items={[
                { label: copy.title, href: "/nutrition" },
                { label: isNew ? copy.newPlan : plan.name || copy.untitled },
              ]}
            />
            <input
              value={plan.name}
              onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
              aria-label={copy.planName}
              placeholder={copy.untitled}
              className="w-full max-w-xl bg-transparent py-0.5 text-4xl font-normal tracking-tight text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <div className="mt-3 flex items-start justify-between gap-6">
              <p className="max-w-xl text-sm text-muted-foreground">{copy.builderHint}</p>
              <button
                type="button"
                onClick={openNotes}
                className="h-16 w-52 shrink-0 rounded-md border border-border bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block text-xs font-medium text-foreground">{copy.notes}</span>
                <span className={`mt-1 line-clamp-2 block text-xs ${plan.notes?.trim() ? "text-foreground" : "text-muted-foreground"}`}>
                  {plan.notes?.trim() || copy.notesHint}
                </span>
              </button>
            </div>
            <GoalFields
              goals={plan.goals}
              totals={totals}
              onChange={(key, value) => setPlan((p) => ({ ...p, goals: { ...p.goals, [key]: value } }))}
            />
          </div>

          <div className="flex shrink-0 items-center gap-3 self-start md:self-auto">
            <span
              className={`flex items-center gap-1.5 text-sm ${isDirty ? "text-foreground" : "text-muted-foreground"}`}
              aria-live="polite"
            >
              {isDirty ? (
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              ) : !isNew && !saving ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : null}
              {status}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={!isDirty || saving}
              title={copy.saveShortcut}
              className="inline-flex items-center gap-2 rounded-lg bg-beshaped-dark-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-beshaped-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-beshaped-dark-green"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isNew ? copy.createPlan : copy.saveChanges}
            </button>
          </div>
        </div>

        {hasMeals ? (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-4">
              {plan.meals.map((meal) => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onChange={updateMeal}
                  onDelete={() => deleteMeal(meal.id)}
                />
              ))}
              <button
                type="button"
                onClick={() => addMeal()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-beshaped-dark-green hover:text-beshaped-dark-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="h-4 w-4" />
                {copy.addMeal}
              </button>
            </div>
            <div className="space-y-4 lg:sticky lg:top-8">
              <MacroSummary totals={totals} mealCount={plan.meals.length} goals={plan.goals} />
              <MacroPie totals={totals} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-beshaped-green/10 text-beshaped-dark-green">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-card-foreground">{copy.firstMeal}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy.firstMealHint}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {mealSuggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addMeal(name)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-beshaped-dark-green hover:text-beshaped-dark-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="h-4 w-4" />
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {notesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeNotes}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-notes-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <h2 id="plan-notes-title" className="text-lg font-semibold text-card-foreground">
              {copy.notesTitle}
            </h2>
            <textarea
              autoFocus
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder={copy.notesPlaceholder}
              className="mt-4 h-[min(28rem,60vh)] w-full resize-none overflow-y-auto rounded-md border border-border bg-background px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeNotes}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copy.notesCancel}
              </button>
              <button
                type="button"
                onClick={saveNotes}
                className="rounded-lg bg-beshaped-dark-green px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-beshaped-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copy.notesDone}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}

function GoalFields({
  goals,
  totals,
  onChange,
}: {
  goals?: MacroGoals;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  onChange: (key: keyof MacroGoals, value: number | undefined) => void;
}) {
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const labelFor: Record<MacroKey, string> = {
    protein: copy.protein,
    carbs: copy.carbs,
    fat: copy.fat,
  };
  const fields: {
    key: keyof MacroGoals;
    label: string;
    unit: string;
    current: number;
    kcalPerGram?: number;
    format: (n: number) => string;
  }[] = [
    { key: "calories", label: copy.calories, unit: copy.kcal, current: totals.calories, format: (n) => formatKcal(n, locale) },
    { key: "protein", label: copy.protein, unit: "g", current: totals.protein, kcalPerGram: 4, format: (n) => formatGrams(n, locale) },
    { key: "carbs", label: copy.carbs, unit: "g", current: totals.carbs, kcalPerGram: 4, format: (n) => formatGrams(n, locale) },
    { key: "fat", label: copy.fat, unit: "g", current: totals.fat, kcalPerGram: 9, format: (n) => formatGrams(n, locale) },
  ];

  const shares = macroGoalShares(goals);
  const calorieGoal = goals?.calories;
  const hasCalorieGoal = calorieGoal != null && calorieGoal > 0;
  const usedKcal = shares.reduce((sum, share) => sum + share.kcal, 0);
  const remainingKcal = hasCalorieGoal ? calorieGoal - usedKcal : 0;
  const openMacros = MACRO_META.filter((meta) => !macroGoalIsSet(goals, meta.key));
  const budgetScale = hasCalorieGoal ? Math.max(calorieGoal, usedKcal) : 0;
  const budgetNote = goalBudgetNote({
    copy,
    locale,
    labelFor,
    hasShares: shares.length > 0,
    usedKcal,
    hasCalorieGoal,
    remainingKcal,
    openMacros: openMacros.map((meta) => meta.key),
  });

  return (
    <div className="mt-4 max-w-2xl">
      <p className="text-xs font-medium text-muted-foreground">{copy.goals}</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map((field) => {
          const goal = goals?.[field.key];
          const reached = goal && goal > 0 ? Math.min(100, (field.current / goal) * 100) : 0;
          return (
            <label key={field.key} className="block">
              <span className="text-xs text-muted-foreground">{field.label}</span>
              <span className="relative mt-1 block">
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={goal ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    onChange(field.key, raw.trim() === "" || !Number.isFinite(n) || n < 0 ? undefined : n);
                  }}
                  aria-label={field.label}
                  className="h-9 w-full rounded-md border border-border bg-background pl-2 pr-8 text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {field.unit}
                </span>
              </span>
              {field.kcalPerGram != null && goal != null && goal > 0 && (
                <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">
                  {copy.goalMacroKcal(field.format(goal), String(field.kcalPerGram), formatKcal(goal * field.kcalPerGram, locale))}
                </span>
              )}
              {goal != null && goal > 0 && (
                <span className="mt-1.5 block">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-beshaped-dark-green" style={{ width: `${reached}%` }} />
                  </span>
                  <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">
                    {copy.goalProgress(field.format(field.current), field.format(goal))}
                  </span>
                </span>
              )}
            </label>
          );
        })}
      </div>
      {hasCalorieGoal && shares.length > 0 && (
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {shares.map((share) => {
            const meta = MACRO_META.find((item) => item.key === share.key);
            return (
              <div
                key={share.key}
                className={meta?.barClass}
                style={{ width: `${(share.kcal / budgetScale) * 100}%` }}
              />
            );
          })}
        </div>
      )}
      {budgetNote && (
        <p className={`mt-1.5 text-xs tabular-nums ${remainingKcal < -0.5 ? "text-amber-700" : "text-muted-foreground"}`}>
          {budgetNote}
        </p>
      )}
    </div>
  );
}

function goalBudgetNote({
  copy,
  locale,
  labelFor,
  hasShares,
  usedKcal,
  hasCalorieGoal,
  remainingKcal,
  openMacros,
}: {
  copy: ReturnType<typeof useMessages>["nutrition"];
  locale: "en" | "af";
  labelFor: Record<MacroKey, string>;
  hasShares: boolean;
  usedKcal: number;
  hasCalorieGoal: boolean;
  remainingKcal: number;
  openMacros: MacroKey[];
}): string | null {
  if (!hasCalorieGoal) return null;

  const roundedLeft = Math.round(remainingKcal);
  const openLabels = openMacros.map((key) => labelFor[key].toLocaleLowerCase(locale === "af" ? "af" : "en"));
  let remainder: string;
  if (roundedLeft <= -1) {
    remainder = copy.goalOver(formatKcal(Math.abs(remainingKcal), locale));
  } else if (roundedLeft >= 1 && openMacros.length === 1) {
    const only = MACRO_META.find((meta) => meta.key === openMacros[0]);
    remainder = copy.goalLeftGrams(
      formatKcal(remainingKcal, locale),
      openLabels[0],
      formatGrams(only ? remainingKcal / only.kcalPerGram : 0, locale)
    );
  } else if (roundedLeft >= 1 && openMacros.length > 1) {
    remainder = copy.goalLeft(formatKcal(remainingKcal, locale), copy.listAnd(openLabels));
  } else if (roundedLeft >= 1) {
    remainder = copy.goalUnassigned(formatKcal(remainingKcal, locale));
  } else if (hasShares) {
    remainder = copy.goalFull;
  } else {
    remainder = copy.goalLeft(formatKcal(remainingKcal, locale), copy.listAnd(openLabels));
  }

  if (!hasShares) return remainder;
  return `${copy.goalUsed(formatKcal(usedKcal, locale))} · ${remainder}`;
}
