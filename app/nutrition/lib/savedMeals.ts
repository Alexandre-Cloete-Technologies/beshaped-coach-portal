import { Meal, MealItem, newId } from "./foods";

// Browser-only storage, like planStore, until saved meals get a Firestore collection (see /schema-change).
const MEALS_STORAGE_KEY = "beshaped:saved-meals";

export const MEAL_CATEGORIES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealCategory = (typeof MEAL_CATEGORIES)[number];

export interface SavedMeal extends Meal {
  category?: MealCategory;
  createdAt: string;
  updatedAt: string;
}

const SEEDED_AT = "2026-11-01T08:00:00.000Z";

const grams = (id: string, foodId: string, g: number): MealItem => ({ id, foodId, grams: g, amountMode: "grams", amount: g });
const pieces = (id: string, foodId: string, count: number, gramsPerPiece: number): MealItem => ({
  id,
  foodId,
  grams: count * gramsPerPiece,
  amountMode: "pieces",
  amount: count,
});

/** Starter library shown until the coach changes it; afterwards the stored list wins. */
const SEED_MEALS: SavedMeal[] = ([
  {
    id: "seed-oats-eggs",
    name: "Oats & eggs",
    category: "breakfast",
    items: [grams("seed-oats-eggs-1", "oats", 100), pieces("seed-oats-eggs-2", "whole-egg", 2, 50)],
  },
  {
    id: "seed-yogurt-bowl",
    name: "Greek yogurt bowl",
    category: "breakfast",
    items: [
      grams("seed-yogurt-bowl-1", "greek-yogurt", 200),
      grams("seed-yogurt-bowl-2", "blueberries", 80),
      grams("seed-yogurt-bowl-3", "honey", 10),
    ],
  },
  {
    id: "seed-chicken-rice",
    name: "Chicken, rice & broccoli",
    category: "lunch",
    items: [
      grams("seed-chicken-rice-1", "chicken-breast", 150),
      grams("seed-chicken-rice-2", "white-rice", 200),
      grams("seed-chicken-rice-3", "broccoli", 100),
    ],
  },
  {
    id: "seed-tuna-potato",
    name: "Tuna & sweet potato",
    category: "lunch",
    items: [
      grams("seed-tuna-potato-1", "tuna", 120),
      grams("seed-tuna-potato-2", "sweet-potato", 200),
      grams("seed-tuna-potato-3", "spinach", 50),
    ],
  },
  {
    id: "seed-salmon-rice",
    name: "Salmon & basmati",
    category: "dinner",
    items: [
      grams("seed-salmon-rice-1", "salmon", 150),
      grams("seed-salmon-rice-2", "basmati", 180),
      grams("seed-salmon-rice-3", "broccoli", 100),
    ],
  },
  {
    id: "seed-mince-pap",
    name: "Mince & pap",
    category: "dinner",
    items: [
      grams("seed-mince-pap-1", "mince", 150),
      grams("seed-mince-pap-2", "maize-meal", 250),
      grams("seed-mince-pap-3", "spinach", 80),
    ],
  },
  {
    id: "seed-biltong-snack",
    name: "Biltong & apple",
    category: "snack",
    items: [grams("seed-biltong-snack-1", "biltong", 40), pieces("seed-biltong-snack-2", "apple", 1, 182)],
  },
  {
    id: "seed-protein-shake",
    name: "Protein shake",
    category: "snack",
    items: [
      grams("seed-protein-shake-1", "whey", 30),
      grams("seed-protein-shake-2", "milk", 250),
      pieces("seed-protein-shake-3", "banana", 1, 118),
    ],
  },
] satisfies Omit<SavedMeal, "createdAt" | "updatedAt">[]).map((meal) => ({ ...meal, createdAt: SEEDED_AT, updatedAt: SEEDED_AT }));

function readAll(): SavedMeal[] {
  try {
    const raw = localStorage.getItem(MEALS_STORAGE_KEY);
    if (raw === null) return SEED_MEALS;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedMeal[]) : [];
  } catch {
    return [];
  }
}

function writeAll(meals: SavedMeal[]) {
  localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(meals));
}

export function listSavedMeals(): SavedMeal[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSavedMeal(id: string): SavedMeal | undefined {
  return readAll().find((m) => m.id === id);
}

export function saveSavedMeal(meal: Meal & { category?: MealCategory }, untitled: string): SavedMeal {
  const meals = readAll();
  const now = new Date().toISOString();
  const existing = meals.find((m) => m.id === meal.id);
  const saved: SavedMeal = {
    id: existing?.id ?? meal.id ?? newId(),
    name: meal.name.trim() || untitled,
    category: meal.category,
    items: meal.items,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeAll(existing ? meals.map((m) => (m.id === saved.id ? saved : m)) : [saved, ...meals]);
  return saved;
}

export function deleteSavedMeal(id: string) {
  writeAll(readAll().filter((m) => m.id !== id));
}

/** Puts a previously deleted meal back exactly as it was (used by Undo). */
export function restoreSavedMeal(meal: SavedMeal) {
  writeAll([meal, ...readAll().filter((m) => m.id !== meal.id)]);
}

export function duplicateSavedMeal(id: string, copySuffix: string, untitled: string): SavedMeal | undefined {
  const source = getSavedMeal(id);
  if (!source) return undefined;
  return saveSavedMeal({ ...copyOfMeal(source), name: `${source.name} (${copySuffix})`, category: source.category }, untitled);
}

/** A detached copy with fresh ids, so a plan's meal and the library meal can change independently. */
export function copyOfMeal(meal: Meal): Meal {
  return { id: newId(), name: meal.name, items: meal.items.map((it) => ({ ...it, id: newId() })) };
}

const CATEGORY_WORDS: Record<MealCategory, string[]> = {
  breakfast: ["breakfast", "ontbyt"],
  lunch: ["lunch", "middagete"],
  dinner: ["dinner", "supper", "aandete"],
  snack: ["snack", "peuselhappie"],
};

/** Best guess from a meal's name when it is saved from a plan, e.g. "Post-workout snack" is a snack. */
export function guessCategory(name: string): MealCategory | undefined {
  const lower = name.toLowerCase();
  return MEAL_CATEGORIES.find((c) => CATEGORY_WORDS[c].some((word) => lower.includes(word)));
}
