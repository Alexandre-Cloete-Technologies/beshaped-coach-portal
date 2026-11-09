"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { formatGrams, formatKcal, macrosForMeal } from "../lib/foods";
import { MEAL_CATEGORIES, MealCategory, SavedMeal, listSavedMeals } from "../lib/savedMeals";

interface SavedMealPickerProps {
  onSelect: (meal: SavedMeal) => void;
  onClose: () => void;
  /** Opens upwards, for triggers near the bottom of the page. */
  placement?: "above" | "below";
}

export default function SavedMealPicker({ onSelect, onClose, placement = "below" }: SavedMealPickerProps) {
  const [meals] = useState(listSavedMeals);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MealCategory | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const { locale } = useLocale();
  const copy = useMessages().nutrition;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meals
      .filter((m) => (!q || m.name.toLowerCase().includes(q)) && (!category || m.category === category))
      .map((meal) => ({ meal, totals: macrosForMeal(meal) }));
  }, [meals, query, category]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) onSelect(result.meal);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const chipClass = (selected: boolean) =>
    `rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      selected
        ? "border-beshaped-dark-green bg-beshaped-dark-green text-white"
        : "border-border bg-background text-foreground hover:bg-muted"
    }`;

  if (meals.length === 0) {
    return (
      <div
        ref={rootRef}
        className={`absolute left-0 right-0 z-20 rounded-xl border border-border bg-popover px-4 py-6 text-center text-sm text-muted-foreground shadow-lg ${
          placement === "above" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        {copy.noSavedMealsToAdd}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`absolute left-0 right-0 z-20 overflow-hidden rounded-xl border border-border bg-popover text-left shadow-lg ${
        placement === "above" ? "bottom-full mb-2" : "top-full mt-2"
      }`}
    >
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[activeIndex] ? `${listId}-${results[activeIndex].meal.id}` : undefined}
          aria-label={copy.searchMeals}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={copy.searchMeals}
          className="h-11 w-full bg-transparent pl-9 pr-3 text-sm text-popover-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2" role="group" aria-label={copy.category}>
        {MEAL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => {
              setCategory(category === c ? null : c);
              setActiveIndex(0);
            }}
            className={chipClass(category === c)}
          >
            {copy[c]}
          </button>
        ))}
      </div>

      <ul ref={listRef} id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
        {results.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            {query.trim() ? copy.noMealsMatch(query) : copy.noMealsInCategory}
          </li>
        ) : (
          results.map(({ meal, totals }, i) => (
            <li
              key={meal.id}
              id={`${listId}-${meal.id}`}
              data-index={i}
              role="option"
              aria-selected={i === activeIndex}
              onPointerEnter={() => setActiveIndex(i)}
              onClick={() => onSelect(meal)}
              className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm text-popover-foreground ${
                i === activeIndex ? "bg-zinc-200" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{meal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {meal.category ? copy[meal.category] : copy.noCategory} · {copy.mealFoodCount(meal.items.length)}
                </p>
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{formatKcal(totals.calories, locale)}</span> {copy.kcal}
                </p>
                <p>
                  {copy.macroLetters
                    .replace("{p}", formatGrams(totals.protein, locale))
                    .replace("{c}", formatGrams(totals.carbs, locale))
                    .replace("{f}", formatGrams(totals.fat, locale))}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
