"use client";

import { useState } from "react";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { MACRO_META, Macros, formatGrams } from "../lib/foods";

const RADIUS = 72;
/** A slice this close to a full circle is drawn as a disc; SVG arcs collapse when start meets end. */
const FULL_CIRCLE = Math.PI * 2 - 0.001;

function slicePath(start: number, end: number): string {
  const sweep = end - start;
  if (sweep >= FULL_CIRCLE) {
    return `M ${RADIUS} 0 A ${RADIUS} ${RADIUS} 0 1 1 ${-RADIUS} 0 A ${RADIUS} ${RADIUS} 0 1 1 ${RADIUS} 0 Z`;
  }
  const x1 = Math.cos(start) * RADIUS;
  const y1 = Math.sin(start) * RADIUS;
  const x2 = Math.cos(end) * RADIUS;
  const y2 = Math.sin(end) * RADIUS;
  const large = sweep > Math.PI ? 1 : 0;
  return `M 0 0 L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function MacroPie({ totals }: { totals: Macros }) {
  const [active, setActive] = useState<number | null>(null);
  const { locale } = useLocale();
  const copy = useMessages().nutrition;
  const label = { protein: copy.protein, carbs: copy.carbs, fat: copy.fat };

  const kcal = MACRO_META.map((m) => totals[m.key] * m.kcalPerGram);
  const total = kcal.reduce((a, b) => a + b, 0);
  const slices = MACRO_META.map((m, i) => ({
    ...m,
    name: label[m.key],
    grams: totals[m.key],
    share: total > 0 ? kcal[i] / total : 0,
  }));

const arcs = slices.reduce<
    { start: number; items: ((typeof slices)[number] & { i: number; start: number; end: number })[] }
  >(
    (acc, slice, i) => {
      const end = acc.start + slice.share * Math.PI * 2;
      return {
        start: end,
        items: slice.share > 0 ? [...acc.items, { ...slice, i, start: acc.start, end }] : acc.items,
      };
    },
    { start: -Math.PI / 2, items: [] }
  ).items;

  const summary = slices
    .map((s) => `${s.name} ${formatGrams(s.grams, locale)} g, ${Math.round(s.share * 100)}%`)
    .join(", ");

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-label={copy.macroSplit}>
      <p className="text-sm font-medium text-muted-foreground">{copy.macroSplit}</p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.macroEmpty}</p>
      ) : (
        <>
          <div className="mt-4 flex justify-center">
            <svg
              viewBox="-80 -80 160 160"
              className="h-44 w-44"
              role="img"
              aria-label={summary}
            >
              {arcs.map((slice) => (
                <path
                  key={slice.key}
                  d={slicePath(slice.start, slice.end)}
                  className={`${slice.fillClass} stroke-card transition-opacity ${
                    active !== null && active !== slice.i ? "opacity-40" : ""
                  }`}
                  strokeWidth={2}
                  onPointerEnter={() => setActive(slice.i)}
                  onPointerLeave={() => setActive(null)}
                >
                  <title>
                    {slice.name}: {formatGrams(slice.grams, locale)} g ({Math.round(slice.share * 100)}%)
                  </title>
                </path>
              ))}
            </svg>
          </div>

          <ul className="mt-4 space-y-2">
            {slices.map((slice, i) => (
              <li
                key={slice.key}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${
                  active === i ? "bg-muted" : ""
                }`}
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${slice.dotClass}`} aria-hidden />
                  {slice.name}
                </span>
                <span className="tabular-nums text-card-foreground">
                  <span className="font-semibold">{formatGrams(slice.grams, locale)} g</span>
                  <span className="ml-2 inline-block w-10 text-right text-xs text-muted-foreground">
                    {Math.round(slice.share * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
