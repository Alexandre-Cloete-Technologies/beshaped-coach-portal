export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food {
  id: string;
  name: string;
  nameAf: string;
  category: keyof {
    Grains: string;
    Vegetables: string;
    Protein: string;
    Dairy: string;
    Fruit: string;
    Fats: string;
    Other: string;
  };
  /** Values per 100 g, approximated from USDA FoodData Central. */
  per100g: Macros;
  /** Edible weight of one serving, such as one large egg. Enables a servings unit. */
  gramsPerPiece?: number;
  /** Grams in one US cup (240 ml) of this food. Liquids can omit this and use gramsPerMl. */
  gramsPerCup?: number;
  /** Grams per millilitre. Set only for liquids, which then offer an ml unit. */
  gramsPerMl?: number;
}

export type AmountMode = "grams" | "pieces" | "cups" | "ml" | "protein" | "carbs" | "fat";

export type UiLocale = "en" | "af";

export function foodName(food: Food, locale: UiLocale): string {
  return locale === "af" ? food.nameAf : food.name;
}

export interface MealItem {
  id: string;
  foodId: string;
  /** Resolved food weight. Macros are always calculated from this. */
  grams: number;
  /** How `amount` should be read. Missing means grams, for plans saved before units existed. */
  amountMode?: AmountMode;
  /** The number the coach typed, in `amountMode` units. */
  amount?: number;
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
}

export interface MacroGoals {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface NutritionPlan {
  name: string;
  meals: Meal[];
  notes?: string;
  goals?: MacroGoals;
}

export const FOODS: Food[] = [
  { id: "oats", name: "Rolled oats (dry)", nameAf: "Hawermout (droog)", category: "Grains", per100g: { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5 }, gramsPerCup: 81 },
  { id: "white-rice", name: "White rice (cooked)", nameAf: "Wit rys (gekook)", category: "Grains", per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }, gramsPerCup: 158 },
  { id: "basmati", name: "Basmati rice (cooked)", nameAf: "Basmatirys (gekook)", category: "Grains", per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }, gramsPerCup: 158 },
  { id: "brown-rice", name: "Brown rice (cooked)", nameAf: "Bruin rys (gekook)", category: "Grains", per100g: { calories: 123, protein: 2.7, carbs: 25.6, fat: 1.0 }, gramsPerCup: 202 },
  { id: "pasta", name: "Pasta (cooked)", nameAf: "Pasta (gekook)", category: "Grains", per100g: { calories: 158, protein: 5.8, carbs: 30.9, fat: 0.9 }, gramsPerCup: 140 },
  // Cooked stiff porridge, not the dry bag. Dry maize meal is roughly three times the calories.
  { id: "maize-meal", name: "Maize meal (cooked)", nameAf: "Mieliemeel (gekook)", category: "Grains", per100g: { calories: 108, protein: 2.4, carbs: 23.5, fat: 0.5 }, gramsPerCup: 250 },
  { id: "wholewheat-bread", name: "Whole wheat bread", nameAf: "Volkorenbrood", category: "Grains", per100g: { calories: 252, protein: 12.4, carbs: 42.7, fat: 3.5 }, gramsPerCup: 46 },
  { id: "sourdough", name: "Sourdough bread", nameAf: "Suurdeegbrood", category: "Grains", per100g: { calories: 272, protein: 10.8, carbs: 51.9, fat: 2.4 }, gramsPerCup: 46 },
  { id: "sweet-potato", name: "Sweet potato (baked)", nameAf: "Patat (gebak)", category: "Vegetables", per100g: { calories: 90, protein: 2.0, carbs: 20.7, fat: 0.2 }, gramsPerCup: 200 },
  { id: "potato", name: "Potato (boiled)", nameAf: "Aartappel (gekook)", category: "Vegetables", per100g: { calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1 }, gramsPerCup: 156 },
  { id: "cucumber", name: "Cucumber", nameAf: "Komkommer", category: "Vegetables", per100g: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 }, gramsPerCup: 104 },
  { id: "whole-egg", name: "Whole egg", nameAf: "Heel eier", category: "Protein", per100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 }, gramsPerPiece: 50, gramsPerCup: 243 },
  { id: "egg-white", name: "Egg white", nameAf: "Eierwit", category: "Protein", per100g: { calories: 52, protein: 10.9, carbs: 0.7, fat: 0.2 }, gramsPerPiece: 33, gramsPerCup: 243 },
  { id: "chicken-breast", name: "Chicken breast (cooked)", nameAf: "Hoenderbors (gekook)", category: "Protein", per100g: { calories: 165, protein: 31.0, carbs: 0, fat: 3.6 }, gramsPerCup: 140 },
  { id: "ground-beef", name: "Lean ground beef 90% (cooked)", nameAf: "Maer gemaalde beesvleis 90% (gekook)", category: "Protein", per100g: { calories: 217, protein: 26.1, carbs: 0, fat: 11.8 }, gramsPerCup: 140 },
  { id: "mince", name: "Beef mince (cooked)", nameAf: "Beesmaalvleis (gekook)", category: "Protein", per100g: { calories: 256, protein: 27.7, carbs: 0, fat: 15.3 }, gramsPerCup: 140 },
  // Not in USDA. Lean moist beef biltong: mostly protein, little carb from the spice.
  { id: "biltong", name: "Biltong", nameAf: "Biltong", category: "Protein", per100g: { calories: 241, protein: 46.5, carbs: 1.5, fat: 5.0 }, gramsPerCup: 80 },
  { id: "salmon", name: "Salmon (cooked)", nameAf: "Salm (gekook)", category: "Protein", per100g: { calories: 206, protein: 22.1, carbs: 0, fat: 12.4 }, gramsPerCup: 136 },
  { id: "tuna", name: "Tuna in water (canned)", nameAf: "Tuna in water (ingeblikt)", category: "Protein", per100g: { calories: 116, protein: 25.5, carbs: 0, fat: 0.8 }, gramsPerCup: 154 },
  { id: "tofu", name: "Firm tofu", nameAf: "Ferm tofu", category: "Protein", per100g: { calories: 144, protein: 17.3, carbs: 2.8, fat: 8.7 }, gramsPerCup: 252 },
  { id: "whey", name: "Whey protein powder", nameAf: "Wei-proteïenpoeier", category: "Protein", per100g: { calories: 400, protein: 80.0, carbs: 8.0, fat: 6.0 }, gramsPerCup: 120 },
  { id: "greek-yogurt", name: "Greek yogurt (non-fat)", nameAf: "Griekse jogurt (vetvry)", category: "Dairy", per100g: { calories: 59, protein: 10.3, carbs: 3.6, fat: 0.4 }, gramsPerCup: 245 },
  { id: "milk", name: "Milk (2%)", nameAf: "Melk (2%)", category: "Dairy", per100g: { calories: 50, protein: 3.3, carbs: 4.8, fat: 2.0 }, gramsPerMl: 1.03 },
  { id: "whole-milk", name: "Full-fat milk", nameAf: "Volroom melk", category: "Dairy", per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 }, gramsPerMl: 1.03 },
  { id: "lactose-free-milk", name: "Lactose-free milk", nameAf: "Laktosevrye melk", category: "Dairy", per100g: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 }, gramsPerMl: 1.03 },
  { id: "cottage-cheese", name: "Cottage cheese (low-fat)", nameAf: "Kotkaas (laevet)", category: "Dairy", per100g: { calories: 72, protein: 12.4, carbs: 2.7, fat: 1.0 }, gramsPerCup: 226 },
  { id: "cheddar", name: "Cheddar cheese", nameAf: "Cheddar-kaas", category: "Dairy", per100g: { calories: 403, protein: 22.9, carbs: 3.1, fat: 33.3 }, gramsPerCup: 113 },
  { id: "feta", name: "Feta", nameAf: "Fetakaas", category: "Dairy", per100g: { calories: 265, protein: 14.2, carbs: 3.9, fat: 21.5 }, gramsPerCup: 150 },
  { id: "banana", name: "Banana", nameAf: "Piesang", category: "Fruit", per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }, gramsPerPiece: 118, gramsPerCup: 150 },
  { id: "apple", name: "Apple", nameAf: "Appel", category: "Fruit", per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 }, gramsPerPiece: 182, gramsPerCup: 109 },
  { id: "blueberries", name: "Blueberries", nameAf: "Bloubessies", category: "Fruit", per100g: { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 }, gramsPerCup: 148 },
  { id: "naartjie", name: "Naartjie", nameAf: "Naartjie", category: "Fruit", per100g: { calories: 53, protein: 0.8, carbs: 13.3, fat: 0.3 }, gramsPerPiece: 88, gramsPerCup: 195 },
  { id: "kiwi", name: "Kiwi", nameAf: "Kiwi", category: "Fruit", per100g: { calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5 }, gramsPerPiece: 69, gramsPerCup: 180 },
  { id: "pineapple", name: "Pineapple", nameAf: "Pynappel", category: "Fruit", per100g: { calories: 50, protein: 0.5, carbs: 13.1, fat: 0.1 }, gramsPerCup: 165 },
  { id: "broccoli", name: "Broccoli", nameAf: "Broccoli", category: "Vegetables", per100g: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 }, gramsPerCup: 91 },
  { id: "spinach", name: "Spinach", nameAf: "Spinasie", category: "Vegetables", per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 }, gramsPerCup: 30 },
  { id: "avocado", name: "Avocado", nameAf: "Avokado", category: "Fats", per100g: { calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7 }, gramsPerPiece: 150, gramsPerCup: 146 },
  { id: "olive-oil", name: "Olive oil", nameAf: "Olyfolie", category: "Fats", per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 }, gramsPerMl: 0.91 },
  { id: "peanut-butter", name: "Peanut butter", nameAf: "Grondboontjiebotter", category: "Fats", per100g: { calories: 588, protein: 25.1, carbs: 20.0, fat: 50.4 }, gramsPerCup: 258 },
  { id: "almonds", name: "Almonds", nameAf: "Amandels", category: "Fats", per100g: { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9 }, gramsPerCup: 143 },
  { id: "honey", name: "Honey", nameAf: "Heuning", category: "Other", per100g: { calories: 304, protein: 0.3, carbs: 82.4, fat: 0 }, gramsPerMl: 1.42 },
];

const FOODS_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export function getFood(id: string): Food | undefined {
  return FOODS_BY_ID.get(id);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 1 US cup = 240 ml. Liquids without their own cup weight use this. */
const ML_PER_CUP = 240;

export function gramsInOneCup(food: Food): number {
  if (food.gramsPerCup && food.gramsPerCup > 0) return food.gramsPerCup;
  if (food.gramsPerMl && food.gramsPerMl > 0) return food.gramsPerMl * ML_PER_CUP;
  return 0;
}

export function amountModesFor(food: Food): AmountMode[] {
  const modes: AmountMode[] = ["grams", "cups"];
  if (food.gramsPerPiece) modes.push("pieces");
  if (food.gramsPerMl) modes.push("ml");
  if (food.per100g.protein > 0) modes.push("protein");
  if (food.per100g.carbs > 0) modes.push("carbs");
  if (food.per100g.fat > 0) modes.push("fat");
  return modes;
}

/** Food weight for a typed amount. 30 g of carbs from a food with 28.2 g carbs per 100 g is about 106 g of that food. */
export function gramsForAmount(food: Food, mode: AmountMode, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (mode === "grams") return amount;
  if (mode === "pieces") return food.gramsPerPiece ? amount * food.gramsPerPiece : 0;
  if (mode === "cups") return amount * gramsInOneCup(food);
  if (mode === "ml") return food.gramsPerMl ? amount * food.gramsPerMl : 0;
  const per100 = food.per100g[mode];
  if (!per100) return 0;
  return (amount / per100) * 100;
}

/** Inverse of gramsForAmount, so switching units keeps the same food weight. */
export function amountForGrams(food: Food, mode: AmountMode, grams: number): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  if (mode === "grams") return grams;
  if (mode === "pieces") return food.gramsPerPiece ? grams / food.gramsPerPiece : 0;
  if (mode === "cups") {
    const perCup = gramsInOneCup(food);
    return perCup ? grams / perCup : 0;
  }
  if (mode === "ml") return food.gramsPerMl ? grams / food.gramsPerMl : 0;
  const per100 = food.per100g[mode];
  if (!per100) return 0;
  return (grams / 100) * per100;
}

export function itemMode(item: MealItem): AmountMode {
  return item.amountMode ?? "grams";
}

export function itemAmount(item: MealItem): number {
  return item.amount ?? item.grams;
}

export function roundedAmount(n: number): number {
  return round1(n);
}

export const EMPTY_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export function macrosForItem(item: MealItem): Macros {
  const food = getFood(item.foodId);
  if (!food || !Number.isFinite(item.grams) || item.grams <= 0) return EMPTY_MACROS;
  const factor = item.grams / 100;
  return {
    calories: food.per100g.calories * factor,
    protein: food.per100g.protein * factor,
    carbs: food.per100g.carbs * factor,
    fat: food.per100g.fat * factor,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    EMPTY_MACROS
  );
}

export function macrosForMeal(meal: Meal): Macros {
  return sumMacros(meal.items.map(macrosForItem));
}

const intlLocale = (locale: UiLocale) => (locale === "af" ? "af-ZA" : "en-US");

export const formatKcal = (n: number, locale: UiLocale = "en") =>
  Math.round(n).toLocaleString(intlLocale(locale));
export const formatGrams = (n: number, locale: UiLocale = "en") =>
  (Math.round(n * 10) / 10).toLocaleString(intlLocale(locale));

export const MACRO_META = [
  { key: "protein", label: "Protein", kcalPerGram: 4, barClass: "bg-sky-500", dotClass: "bg-sky-500", fillClass: "fill-sky-500" },
  { key: "carbs", label: "Carbs", kcalPerGram: 4, barClass: "bg-amber-500", dotClass: "bg-amber-500", fillClass: "fill-amber-500" },
  { key: "fat", label: "Fat", kcalPerGram: 9, barClass: "bg-rose-500", dotClass: "bg-rose-500", fillClass: "fill-rose-500" },
] as const;

export type MacroKey = (typeof MACRO_META)[number]["key"];

export interface MacroGoalShare {
  key: MacroKey;
  grams: number;
  kcal: number;
  kcalPerGram: number;
}

/** Calorie cost of each macro goal the coach has set. Protein and carbs are 4 kcal/g, fat is 9. */
export function macroGoalShares(goals?: MacroGoals): MacroGoalShare[] {
  if (!goals) return [];
  return MACRO_META.flatMap((meta) => {
    const grams = goals[meta.key];
    if (grams == null || !(grams > 0)) return [];
    return [{ key: meta.key, grams, kcal: grams * meta.kcalPerGram, kcalPerGram: meta.kcalPerGram }];
  });
}

/** A macro goal counts as chosen even at 0 g, so it is no longer "left to spend". */
export function macroGoalIsSet(goals: MacroGoals | undefined, key: MacroKey): boolean {
  const grams = goals?.[key];
  return grams != null && Number.isFinite(grams) && grams >= 0;
}

/** Macros that supply at least a quarter of the food's calories. A food can match more than one. */
export function foodMacroTags(food: Food): MacroKey[] {
  const shares: Record<MacroKey, number> = {
    protein: food.per100g.protein * 4,
    carbs: food.per100g.carbs * 4,
    fat: food.per100g.fat * 9,
  };
  const total = shares.protein + shares.carbs + shares.fat;
  if (total <= 0) return [];
  return MACRO_META.map((m) => m.key).filter((key) => shares[key] / total >= 0.25);
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
