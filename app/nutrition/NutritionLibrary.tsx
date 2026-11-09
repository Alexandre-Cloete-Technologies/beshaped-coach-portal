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
import { MACRO_META, formatGrams, formatKcal, macrosForMeal, sumMacros } from "./lib/foods";
import { StoredPlan, deletePlan, duplicatePlan, formatUpdated, listPlans, restorePlan } from "./lib/planStore";

const primaryButtonClass =
  "inline-flex shrink-0 items-center gap-2 rounded-lg bg-beshaped-dark-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-beshaped-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Client-only (reads localStorage on first render); load via next/dynamic with ssr: false. */
export default function NutritionLibrary() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const [plans, setPlans] = useState<StoredPlan[]>(listPlans);
  const [query, setQuery] = useState("");
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plans
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((p) => ({ plan: p, totals: sumMacros(p.meals.map(macrosForMeal)) }));
  }, [plans, query]);

  const refresh = () => setPlans(listPlans());

  const handleDelete = (plan: StoredPlan) => {
    deletePlan(plan.id);
    refresh();
    showToast({
      message: copy.deletedNamed(plan.name),
      action: {
        label: copy.undo,
        onClick: () => {
          restorePlan(plan);
          refresh();
        },
      },
    });
  };

  const handleDuplicate = (plan: StoredPlan) => {
    const duplicated = duplicatePlan(plan.id, copy.copySuffix);
    refresh();
    if (duplicated) showToast({ message: copy.createdNamed(duplicated.name) });
  };

  return (
    <>
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Breadcrumbs items={[{ label: copy.title }]} />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{copy.plansTitle}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {plans.length === 0 ? copy.emptyLibraryHint : copy.planSummary(plans.length)}
            </p>
          </div>
          {plans.length > 0 && (
            <Link href="/nutrition/builder" className={`${primaryButtonClass} self-start md:self-auto`}>
              <Plus className="h-4 w-4" />
              {copy.newPlan}
            </Link>
          )}
        </div>

        <NutritionTabs />

        {plans.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-beshaped-green/10 text-beshaped-dark-green">
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-card-foreground">{copy.noneYet}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">{copy.noneYetHint}</p>
            <Link href="/nutrition/builder" className={`${primaryButtonClass} mt-6`}>
              <Plus className="h-4 w-4" />
              {copy.createFirst}
            </Link>
          </div>
        ) : (
          <>
            <div className="relative mb-4 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={copy.searchPlans}
                placeholder={copy.searchPlans}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-xs font-medium text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-medium">{copy.name}</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">{copy.meals}</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">{copy.caloriesPerDay}</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">{copy.macros}</th>
                    <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">{copy.lastUpdated}</th>
                    <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">{copy.actions}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        {copy.noMatch(query)}{" "}
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="font-medium text-beshaped-dark-green hover:underline"
                        >
                          {copy.clearSearch}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    rows.map(({ plan, totals }) => (
                      <tr
                        key={plan.id}
                        onClick={() => router.push(`/nutrition/${plan.id}`)}
                        className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/nutrition/${plan.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-card-foreground hover:underline focus-visible:underline focus-visible:outline-none"
                          >
                            {plan.name}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{plan.meals.length}</td>
                        <td className="px-3 py-3 text-right tabular-nums font-medium text-card-foreground">
                          {formatKcal(totals.calories, locale)} {copy.kcal}
                        </td>
                        <td className="hidden px-3 py-3 md:table-cell">
                          <div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                            {MACRO_META.map((m) => (
                              <span key={m.key} className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${m.dotClass}`} aria-hidden />
                                <span className="sr-only">
                                  {m.key === "protein" ? copy.protein : m.key === "carbs" ? copy.carbs : copy.fat}
                                </span>
                                {formatGrams(totals[m.key], locale)} g
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell">
                          <time
                            dateTime={plan.updatedAt}
                            title={new Date(plan.updatedAt).toLocaleString(locale === "af" ? "af-ZA" : "en-US")}
                          >
                            {formatUpdated(plan.updatedAt, locale, copy.justNow)}
                          </time>
                        </td>
                        <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu
                            label={copy.actionsFor(plan.name)}
                            items={[
                              {
                                label: copy.edit,
                                icon: <Pencil className="h-4 w-4" />,
                                onSelect: () => router.push(`/nutrition/${plan.id}`),
                              },
                              {
                                label: copy.duplicate,
                                icon: <Copy className="h-4 w-4" />,
                                onSelect: () => handleDuplicate(plan),
                              },
                              {
                                label: copy.delete,
                                icon: <Trash2 className="h-4 w-4" />,
                                destructive: true,
                                onSelect: () => handleDelete(plan),
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
