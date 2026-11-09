"use client";

import { useState } from "react";
import { BookmarkPlus, Plus, Trash2, X } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import FoodPicker from "./FoodPicker";
import {
  Food,
  Meal,
  MealItem,
  AmountMode,
  amountForGrams,
  amountModesFor,
  foodName,
  formatGrams,
  formatKcal,
  getFood,
  gramsForAmount,
  itemAmount,
  itemMode,
  macrosForItem,
  macrosForMeal,
  newId,
  roundedAmount,
} from "../lib/foods";

interface MealCardProps {
  meal: Meal;
  onChange: (meal: Meal) => void;
  /** Omit to hide the delete button, e.g. when the card is the whole saved meal. */
  onDelete?: () => void;
  /** Shows a button that copies this meal into the saved meals library. */
  onSaveToLibrary?: () => void;
}

const DEFAULT_GRAMS = 100;

export default function MealCard({ meal, onChange, onDelete, onSaveToLibrary }: MealCardProps) {
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const totals = macrosForMeal(meal);

  const updateItem = (itemId: string, patch: Partial<MealItem>) =>
    onChange({
      ...meal,
      items: meal.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    });

  const removeItem = (itemId: string) =>
    onChange({ ...meal, items: meal.items.filter((it) => it.id !== itemId) });

  const addFood = (food: Food) => {
    const item: MealItem = { id: newId(), foodId: food.id, grams: DEFAULT_GRAMS };
    onChange({ ...meal, items: [...meal.items, item] });
    setFocusItemId(item.id);
    setPickerOpen(false);
  };

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm" aria-label={meal.name || copy.meal}>
      <header className="flex items-center justify-between gap-4 rounded-t-xl border-b border-border bg-zinc-200 px-5 py-3">
        <input
          value={meal.name}
          onChange={(e) => onChange({ ...meal, name: e.target.value })}
          aria-label={copy.mealName}
          placeholder={copy.mealName}
          className="-ml-2 min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-base font-semibold text-card-foreground placeholder:text-muted-foreground hover:bg-muted/60 focus:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex shrink-0 items-center gap-4">
          <p className="text-sm tabular-nums text-muted-foreground">
            <span className="font-semibold text-card-foreground">{formatKcal(totals.calories, locale)}</span> {copy.kcal}
          </p>
          {onSaveToLibrary && (
            <button
              type="button"
              onClick={onSaveToLibrary}
              disabled={meal.items.length === 0}
              title={copy.saveToLibrary}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-beshaped-green/10 hover:text-beshaped-dark-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
            >
              <BookmarkPlus className="h-4 w-4" />
              {copy.saveToLibrary}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={copy.deleteNamedMeal(meal.name || copy.mealFallback)}
              title={copy.deleteMeal}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {meal.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th scope="col" className="px-5 py-2 font-medium">{copy.food}</th>
                <th scope="col" className="w-52 px-3 py-2 font-medium">{copy.amount}</th>
                <th scope="col" className="w-20 px-3 py-2 text-right font-medium">{copy.calories}</th>
                <th scope="col" className="w-20 px-3 py-2 text-right font-medium">{copy.protein}</th>
                <th scope="col" className="w-20 px-3 py-2 text-right font-medium">{copy.carbs}</th>
                <th scope="col" className="w-20 px-3 py-2 text-right font-medium">{copy.fat}</th>
                <th scope="col" className="w-12 px-3 py-2"><span className="sr-only">{copy.actions}</span></th>
              </tr>
            </thead>
            <tbody>
              {meal.items.map((item) => {
                const food = getFood(item.foodId);
                const label = food ? foodName(food, locale) : copy.unknownFood;
                const mode = itemMode(item);
                const amount = itemAmount(item);
                const modes = food ? amountModesFor(food) : (["grams"] as AmountMode[]);
                const modeLabel = (next: AmountMode) => {
                  if (next === "grams") return copy.unitGrams;
                  if (next === "cups") return copy.unitCups;
                  if (next === "ml") return copy.unitMl;
                  if (next === "pieces") return copy.unitServings;
                  if (next === "protein") return copy.protein;
                  if (next === "carbs") return copy.carbs;
                  return copy.fat;
                };
                const setAmount = (nextAmount: number, nextMode = mode) => {
                  updateItem(item.id, {
                    amountMode: nextMode,
                    amount: nextAmount,
                    grams: food ? gramsForAmount(food, nextMode, nextAmount) : nextMode === "grams" ? nextAmount : 0,
                  });
                };
                const m = macrosForItem(item);
                return (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="px-5 py-2 font-medium text-card-foreground">{label}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={mode === "pieces" ? 1 : mode === "cups" ? 0.25 : 5}
                          autoFocus={item.id === focusItemId}
                          onFocus={(e) => item.id === focusItemId && e.currentTarget.select()}
                          value={amount === 0 ? "" : amount}
                          onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                          aria-label={`${copy.amountOf(food ? foodName(food, locale) : copy.foodFallback)} (${modeLabel(mode)})`}
                          className="h-8 w-16 rounded-md border border-border bg-background px-2 text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <select
                          value={mode}
                          onChange={(e) => {
                            const nextMode = e.target.value as AmountMode;
                            const nextAmount = food ? roundedAmount(amountForGrams(food, nextMode, item.grams)) : amount;
                            setAmount(nextAmount, nextMode);
                          }}
                          aria-label={copy.amount}
                          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {modes.map((option) => (
                            <option key={option} value={option}>{modeLabel(option)}</option>
                          ))}
                        </select>
                      </div>
                      {mode !== "grams" && (
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {copy.aboutGrams(formatGrams(item.grams, locale))}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-card-foreground">{formatKcal(m.calories, locale)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatGrams(m.protein, locale)} g</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatGrams(m.carbs, locale)} g</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatGrams(m.fat, locale)} g</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={copy.removeNamed(food ? foodName(food, locale) : copy.foodFallback)}
                        title={copy.remove}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/40 font-semibold text-card-foreground">
                <th scope="row" className="px-5 py-2 text-left">{copy.mealTotal}</th>
                <td className="px-3 py-2 tabular-nums text-muted-foreground font-normal">
                  {formatGrams(meal.items.reduce((s, it) => s + it.grams, 0), locale)} g
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatKcal(totals.calories, locale)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatGrams(totals.protein, locale)} g</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatGrams(totals.carbs, locale)} g</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatGrams(totals.fat, locale)} g</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="relative px-5 py-3">
        {meal.items.length === 0 && (
          <p className="mb-2 text-sm text-muted-foreground">{copy.noFoodsYet}</p>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-expanded={pickerOpen}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 -ml-2 text-sm font-medium text-beshaped-dark-green transition-colors hover:bg-beshaped-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          {copy.addFood}
        </button>
        {pickerOpen && <FoodPicker onSelect={addFood} onClose={() => setPickerOpen(false)} />}
      </div>
    </section>
  );
}
