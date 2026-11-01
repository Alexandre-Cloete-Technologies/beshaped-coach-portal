"use client";

import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { MACRO_META, MacroGoals, Macros, formatGrams, formatKcal } from "../lib/foods";

interface MacroSummaryProps {
  totals: Macros;
  mealCount: number;
  goals?: MacroGoals;
}

export default function MacroSummary({ totals, mealCount, goals }: MacroSummaryProps) {
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const label = { protein: copy.protein, carbs: copy.carbs, fat: copy.fat };
  const macroKcal = MACRO_META.map((m) => totals[m.key] * m.kcalPerGram);
  const macroKcalTotal = macroKcal.reduce((a, b) => a + b, 0);
  const pct = (i: number) => (macroKcalTotal > 0 ? (macroKcal[i] / macroKcalTotal) * 100 : 0);

  return (
    <aside className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-label={copy.dailyTotal}>
      <p className="text-sm font-medium text-muted-foreground">{copy.dailyTotal}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-card-foreground">
        {formatKcal(totals.calories, locale)}
        {goals?.calories != null && goals.calories > 0 && (
          <span className="text-lg font-normal text-muted-foreground"> / {formatKcal(goals.calories, locale)}</span>
        )}
        <span className="ml-1 text-base font-normal text-muted-foreground">{copy.kcal}</span>
      </p>
      {goals?.calories != null && goals.calories > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-beshaped-dark-green"
            style={{ width: `${Math.min(100, (totals.calories / goals.calories) * 100)}%` }}
          />
        </div>
      )}
      <p className="mt-1 text-xs text-muted-foreground">{copy.acrossMeals(mealCount)}</p>

      <div
        className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={MACRO_META.map((m, i) => `${label[m.key]} ${Math.round(pct(i))}%`).join(", ")}
      >
        {MACRO_META.map((m, i) => (
          <div key={m.key} className={m.barClass} style={{ width: `${pct(i)}%` }} />
        ))}
      </div>

      <dl className="mt-4 space-y-3">
        {MACRO_META.map((m, i) => {
          const goal = goals?.[m.key];
          const hasGoal = goal != null && goal > 0;
          const toward = hasGoal ? Math.min(100, (totals[m.key] / goal) * 100) : 0;
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between text-sm">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${m.dotClass}`} aria-hidden />
                  {label[m.key]}
                </dt>
                <dd className="tabular-nums text-card-foreground">
                  <span className="font-semibold">
                    {hasGoal
                      ? copy.goalProgress(formatGrams(totals[m.key], locale), formatGrams(goal, locale))
                      : formatGrams(totals[m.key], locale)}{" "}
                    g
                  </span>
                  <span className="ml-2 inline-block w-10 text-right text-xs text-muted-foreground">
                    {hasGoal ? `${Math.round((totals[m.key] / goal) * 100)}%` : `${Math.round(pct(i))}%`}
                  </span>
                </dd>
              </div>
              {hasGoal && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${m.barClass}`} style={{ width: `${toward}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
