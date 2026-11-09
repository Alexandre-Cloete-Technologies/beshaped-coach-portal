"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import Breadcrumbs from "../components/Breadcrumbs";
import NutritionTabs from "./components/NutritionTabs";
import MealCard from "./components/MealCard";
import MacroPie from "./components/MacroPie";
import Toast, { useToast } from "./components/Toast";
import { MACRO_META, Meal, formatGrams, formatKcal, macrosForMeal, newId } from "./lib/foods";
import { MEAL_CATEGORIES, MealCategory, getSavedMeal, saveSavedMeal } from "./lib/savedMeals";
import { useSaveShortcut, useUnsavedChangesWarning } from "./lib/useEditorGuards";

type EditableMeal = Meal & { category?: MealCategory };

const snapshotOf = (m: EditableMeal) => JSON.stringify({ name: m.name, items: m.items, category: m.category ?? null });

interface InitialState {
  meal: EditableMeal;
  snapshot: string;
  notFound: boolean;
}

function loadInitial(mealId?: string): InitialState {
  const empty: EditableMeal = { id: newId(), name: "", items: [] };
  if (!mealId) return { meal: empty, snapshot: snapshotOf(empty), notFound: false };
  const stored = getSavedMeal(mealId);
  if (!stored) return { meal: empty, snapshot: snapshotOf(empty), notFound: true };
  const meal = { id: stored.id, name: stored.name, items: stored.items, category: stored.category };
  return { meal, snapshot: snapshotOf(meal), notFound: false };
}

/** Client-only (reads localStorage on first render); load via next/dynamic with ssr: false. */
export default function SavedMealEditor({ mealId }: { mealId?: string }) {
  const [initial] = useState(() => loadInitial(mealId));
  const [isNew, setIsNew] = useState(!mealId);
  const [meal, setMeal] = useState<EditableMeal>(initial.meal);
  const [savedSnapshot, setSavedSnapshot] = useState(initial.snapshot);
  const [saving, setSaving] = useState(false);
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const isDirty = snapshotOf(meal) !== savedSnapshot;
  const totals = macrosForMeal(meal);

  const save = () => {
    if (saving || !isDirty) return;
    setSaving(true);
    try {
      const saved = saveSavedMeal(meal, copy.untitledMeal);
      const next = { id: saved.id, name: saved.name, items: saved.items, category: saved.category };
      setMeal(next);
      setSavedSnapshot(snapshotOf(next));
      if (isNew) {
        setIsNew(false);
        window.history.replaceState(null, "", `/nutrition/meals/${saved.id}`);
      }
      showToast({ message: isNew ? copy.mealCreated : copy.changesSaved });
    } catch (error) {
      console.error("Error saving meal:", error);
      showToast({ message: copy.mealSaveFailed });
    } finally {
      setSaving(false);
    }
  };

  useSaveShortcut(save);
  useUnsavedChangesWarning(isDirty, copy.leaveWarning);

  if (initial.notFound) {
    return (
      <div className="mx-auto max-w-6xl p-8">
        <Breadcrumbs
          items={[
            { label: copy.title, href: "/nutrition" },
            { label: copy.mealsTab, href: "/nutrition/meals" },
            { label: copy.notFound },
          ]}
        />
        <div className="mt-6 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-card-foreground">{copy.mealMissingTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.mealMissingHint}</p>
          <Link
            href="/nutrition/meals"
            className="mt-6 inline-flex items-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {copy.backToMeals}
          </Link>
        </div>
      </div>
    );
  }

  const title = meal.name.trim() || (isNew ? copy.newMeal : copy.untitledMeal);
  const status = saving ? copy.saving : isDirty ? copy.unsaved : isNew ? copy.notSavedYet : copy.allSaved;

  return (
    <>
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <Breadcrumbs
              items={[
                { label: copy.title, href: "/nutrition" },
                { label: copy.mealsTab, href: "/nutrition/meals" },
                { label: title },
              ]}
            />
            <h1 className="truncate text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{copy.mealEditorHint}</p>
            <label className="mt-4 block w-48">
              <span className="text-xs font-medium text-muted-foreground">{copy.category}</span>
              <select
                value={meal.category ?? ""}
                onChange={(e) =>
                  setMeal((m) => ({ ...m, category: (e.target.value || undefined) as MealCategory | undefined }))
                }
                className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{copy.noCategory}</option>
                {MEAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{copy[c]}</option>
                ))}
              </select>
            </label>
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
              {isNew ? copy.createMeal : copy.saveChanges}
            </button>
          </div>
        </div>

        <NutritionTabs />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <MealCard meal={meal} onChange={(next) => setMeal((m) => ({ ...next, category: m.category }))} />
          <div className="space-y-4 lg:sticky lg:top-8">
            <aside className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-label={copy.mealTotals}>
              <p className="text-sm font-medium text-muted-foreground">{copy.mealTotals}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-card-foreground">
                {formatKcal(totals.calories, locale)}
                <span className="ml-1 text-base font-normal text-muted-foreground">{copy.kcal}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.mealFoodCount(meal.items.length)}</p>
              <dl className="mt-4 space-y-2 text-sm">
                {MACRO_META.map((m) => (
                  <div key={m.key} className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${m.dotClass}`} aria-hidden />
                      {copy[m.key]}
                    </dt>
                    <dd className="tabular-nums font-medium text-card-foreground">{formatGrams(totals[m.key], locale)} g</dd>
                  </div>
                ))}
              </dl>
            </aside>
            <MacroPie totals={totals} />
          </div>
        </div>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
