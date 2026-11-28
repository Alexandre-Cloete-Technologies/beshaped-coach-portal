import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Breadcrumbs, { type BreadcrumbItem } from "./Breadcrumbs";

/**
 * The title block at the top of every page, so titles look and sit the same everywhere: a large title, one short
 * line of description, and the page's main buttons on the right.
 *
 * Breadcrumbs are only for pages deeper than a section's main page (an exercise, a workout being edited, a
 * nutrition plan). Main pages reached from the sidebar don't get them: the sidebar already shows where you are.
 */
export default function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons shown to the right of the title (stacked under it on narrow screens). */
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
