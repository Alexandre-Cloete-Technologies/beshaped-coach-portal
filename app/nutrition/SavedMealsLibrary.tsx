"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import Breadcrumbs from "../components/Breadcrumbs";
import NutritionTabs from "./components/NutritionTabs";
import RowMenu from "./components/RowMenu";
import Toast, { useToast } from "./components/Toast";
import { MACRO_META, formatGrams, formatKcal, macrosForMeal } from "./lib/foods";
import { formatUpdated } from "./lib/planStore";
import {
  MEAL_CATEGORIES,
  MealCategory,
  SavedMeal,
  deleteSavedMeal,
  duplicateSavedMeal,
  listSavedMeals,
  restoreSavedMeal,
} from "./lib/savedMeals";

const primaryButtonClass =
  "inline-flex shrink-0 items-center gap-2 rounded-lg bg-beshaped-dark-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-beshaped-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Client-only (reads localStorage on first render); load via next/dynamic with ssr: false. */
export default function SavedMealsLibrary() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const [meals, setMeals] = useState<SavedMeal[]>(listSavedMeals);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MealCategory | null>(null);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meals
      .filter((m) => (!q || m.name.toLowerCase().includes(q)) && (!category || m.category === category))
      .map((m) => ({ meal: m, totals: macrosForMeal(m) }));
  }, [meals, query, category]);

  const refresh = () => setMeals(listSavedMeals());

  const handleDelete = (meal: SavedMeal) => {
    deleteSavedMeal(meal.id);
    refresh();
    showToast({
      message: copy.deletedNamed(meal.name),
      action: {
        label: copy.undo,
        onClick: () => {
          restoreSavedMeal(meal);
          refresh();
        },
      },
    });
  };

  const handleDuplicate = (meal: SavedMeal) => {
    const duplicated = duplicateSavedMeal(meal.id, copy.copySuffix, copy.untitledMeal);
    refresh();
    if (duplicated) showToast({ message: copy.createdNamed(duplicated.name) });
  };

  const chipClass = (selected: boolean) =>
    `rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      selected
        ? "border-beshaped-dark-green bg-beshaped-dark-green text-white"
        : "border-border bg-background text-foreground hover:bg-muted"
    }`;

  return (
    <>
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Breadcrumbs items={[{ label: copy.title, href: "/nutrition" }, { label: copy.mealsTab }]} />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{copy.savedMealsTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meals.length === 0 ? copy.savedMealsEmptyHint : copy.savedMealsSummary(meals.length)}
            </p>
          </div>
          {meals.length > 0 && (
            <Link href="/nutrition/meals/new" className={`${primaryButtonClass} self-start md:self-auto`}>
              <Plus className="h-4 w-4" />
              {copy.newMeal}
            </Link>
          )}
        </div>

        <NutritionTabs />

        {meals.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-beshaped-green/10 text-beshaped-dark-green">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-card-foreground">{copy.noSavedMeals}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy.noSavedMealsHint}</p>
            <Link href="/nutrition/meals/new" className={`${primaryButtonClass} mt-6`}>
              <Plus className="h-4 w-4" />
              {copy.createFirstMeal}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label={copy.searchMeals}
                  placeholder={copy.searchMeals}
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label={copy.category}>
                <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chipClass(category === null)}>
                  {copy.allCategories}
                </button>
                {MEAL_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={category === c}
                    onClick={() => setCategory(category === c ? null : c)}
                    className={chipClass(category === c)}
                  >
                    {copy[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-xs font-medium text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-medium">{copy.name}</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium sm:table-cell">{copy.category}</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">{copy.foods}</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">{copy.calories}</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">{copy.macros}</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">{copy.lastUpdated}</th>
                    <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">{copy.actions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        {query.trim() ? copy.noMealsMatch(query) : copy.noMealsInCategory}{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setCategory(null);
                          }}
                          className="font-medium text-beshaped-dark-green hover:underline"
                        >
                          {copy.clearSearch}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ meal, totals }) => (
                      <tr
                        key={meal.id}
                        onClick={() => router.push(`/nutrition/meals/${meal.id}`)}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/nutrition/meals/${meal.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-card-foreground hover:underline focus-visible:underline focus-visible:outline-none"
                          >
                            {meal.name}
                          </Link>
                        </td>
                        <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell">
                          {meal.category ? copy[meal.category] : copy.noCategory}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{meal.items.length}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-card-foreground">
                          {formatKcal(totals.calories, locale)} {copy.kcal}
                        </td>
                        <td className="hidden px-3 py-3 md:table-cell">
                          <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                            {MACRO_META.map((m) => (
                              <span key={m.key} className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${m.dotClass}`} aria-hidden />
                                <span className="sr-only">{copy[m.key]}</span>
                                {formatGrams(totals[m.key], locale)} g
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">
                          <time
                            dateTime={meal.updatedAt}
                            title={new Date(meal.updatedAt).toLocaleString(locale === "af" ? "af-ZA" : "en-US")}
                          >
                            {formatUpdated(meal.updatedAt, locale, copy.justNow)}
                          </time>
                        </td>
                        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu
                            label={copy.actionsFor(meal.name)}
                            items={[
                              {
                                label: copy.edit,
                                icon: <Pencil className="h-4 w-4" />,
                                onSelect: () => router.push(`/nutrition/meals/${meal.id}`),
                              },
                              {
                                label: copy.duplicate,
                                icon: <Copy className="h-4 w-4" />,
                                onSelect: () => handleDuplicate(meal),
                              },
                              {
                                label: copy.delete,
                                icon: <Trash2 className="h-4 w-4" />,
                                destructive: true,
                                onSelect: () => handleDelete(meal),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
