"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { FOODS, Food, MacroKey, foodMacroTags, foodName, formatGrams, formatKcal } from "../lib/foods";

interface FoodPickerProps {
  onSelect: (food: Food) => void;
  onClose: () => void;
}

export default function FoodPicker({ onSelect, onClose }: FoodPickerProps) {
  const [query, setQuery] = useState("");
  const [selectedMacros, setSelectedMacros] = useState<Set<MacroKey>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const { locale } = useLocale();
  const t = useMessages();
  const copy = t.nutrition;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOODS.filter((f) => {
      const matchesQuery =
        !q ||
        [f.name, f.nameAf, f.category, t.foodCategory[f.category]].some((value) =>
          value.toLowerCase().includes(q)
        );
      const matchesMacros =
        selectedMacros.size === 0 || foodMacroTags(f).some((tag) => selectedMacros.has(tag));
      return matchesQuery && matchesMacros;
    });
  }, [query, selectedMacros, t]);

  const toggleMacro = (key: MacroKey) => {
    setSelectedMacros((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActiveIndex(0);
  };

  const macroFilters: { key: MacroKey; label: string }[] = [
    { key: "protein", label: copy.protein },
    { key: "carbs", label: copy.carbs },
    { key: "fat", label: copy.fat },
  ];

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
      const food = results[activeIndex];
      if (food) onSelect(food);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      ref={rootRef}
      className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
    >
      <div className="relative border-b border-border">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[activeIndex] ? `${listId}-${results[activeIndex].id}` : undefined}
          aria-label={copy.searchFoods}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={copy.searchFoodsPlaceholder}
          className="h-11 w-full bg-transparent pl-9 pr-3 text-sm text-popover-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2" role="group" aria-label={copy.macros}>
        {macroFilters.map((filter) => {
          const selected = selectedMacros.has(filter.key);
          return (
            <button
              key={filter.key}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleMacro(filter.key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? "border-beshaped-dark-green bg-beshaped-dark-green text-white"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <ul ref={listRef} id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
        {results.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            {query.trim() ? copy.noFoodsMatch(query) : copy.noFoodsForFilters}
          </li>
        ) : (
          results.map((food, i) => (
            <li
              key={food.id}
              id={`${listId}-${food.id}`}
              data-index={i}
              role="option"
              aria-selected={i === activeIndex}
              onPointerEnter={() => setActiveIndex(i)}
              onClick={() => onSelect(food)}
              className={`flex cursor-pointer items-center justify-between gap-4 px-4 py-2 text-sm text-popover-foreground ${
                i === activeIndex ? "bg-zinc-200" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{foodName(food, locale)}</p>
                <p className="text-xs text-muted-foreground">{t.foodCategory[food.category]}</p>
              </div>
              <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{formatKcal(food.per100g.calories, locale)}</span>{" "}
                  {copy.per100g}
                </p>
                <p>
                  {copy.macroLetters
                    .replace("{p}", formatGrams(food.per100g.protein, locale))
                    .replace("{c}", formatGrams(food.per100g.carbs, locale))
                    .replace("{f}", formatGrams(food.per100g.fat, locale))}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
