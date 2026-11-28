"use client";

import { Calendar, Layers, Users, Edit, Trash2 } from "lucide-react";

export interface ProgramData {
  id: string;
  name: string;
  description?: string;
  totalDuration: number; // weeks
  phasesCount: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  focusAreas: string[];
  isTemplate?: boolean;
  activeClients?: number;
  clientAvatars?: string[];
  updatedAt?: string;
  createdBy?: string;
  accessType?: "free" | "paid" | "assigned";
  price?: number | null;
}

interface ProgramCardProps {
  program: ProgramData;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/** Small tag for how clients get the program: Free, Custom or Paid (with the price when set). */
function AccessTag({ accessType, price }: Pick<ProgramData, "accessType" | "price">) {
  if (!accessType) return null;
  const label =
    accessType === "paid" ? (price != null ? `$${price}` : "Paid") : accessType === "assigned" ? "Custom" : "Free";
  // Brand green (the action shade, so the white text stays readable), same for every access type.
  return (
    <span className="inline-flex shrink-0 items-center rounded-none bg-action px-3 py-1 text-xs font-medium text-white">
      {label}
    </span>
  );
}

/**
 * A program in the library. The whole card opens the program; edit and delete sit in the footer.
 * Hover only firms up the border and shadow (no lifting), like the other cards and tables.
 */
export default function ProgramCard({ program, onView, onEdit, onDelete }: ProgramCardProps) {
  const clients = program.activeClients ?? 0;
  const byline = program.updatedAt || (program.createdBy ? `Created by ${program.createdBy}` : "");

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`Open ${program.name}`}
      onClick={() => onView?.(program.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onView?.(program.id);
      }}
      className="flex cursor-pointer flex-col rounded-xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold leading-snug text-card-foreground">{program.name}</h3>
          <AccessTag accessType={program.accessType} price={program.price} />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {program.totalDuration} {program.totalDuration === 1 ? "week" : "weeks"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            {program.phasesCount} {program.phasesCount === 1 ? "phase" : "phases"}
          </span>
        </div>

        {program.description?.trim() && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{program.description}</p>
        )}

        {byline && <p className="mt-auto text-xs text-muted-foreground">{byline}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {clients} {clients === 1 ? "client" : "clients"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(program.id);
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            title="Edit"
            aria-label={`Edit ${program.name}`}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(program.id);
            }}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            title="Delete"
            aria-label={`Delete ${program.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
