"use client";

export type ProgramBuilderFooterBarProps = {
  saving: boolean;
  submitLabel: string;
  onSave: () => void;
  /** Revert to last loaded/saved program (detail page). Omitted on create flow. */
  onRevertToLastLoaded?: () => void;
  /** Wipe editor to default / run parent clear handler. */
  onClearAll?: () => void;
};

const barWrapClass =
  "pointer-events-auto absolute bottom-0 right-0 left-0 z-40 bg-card/90 backdrop-blur-md border-t border-border px-8 py-4 md:left-[280px]";
const innerClass =
  "mx-auto flex max-w-[1280px] items-center justify-end gap-3";

const revertToLastLoadedClass =
  "rounded-lg border border-yellow-900/80 bg-yellow-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-yellow-900 disabled:cursor-not-allowed disabled:opacity-50";

const clearAllClass =
  "rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50";

const saveClass =
  "rounded-lg border border-border px-4 py-2 text-sm font-semibold text-white bg-beshaped-dark-green hover:bg-beshaped-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function ProgramBuilderFooterBar({
  saving,
  submitLabel,
  onSave,
  onRevertToLastLoaded,
  onClearAll,
}: ProgramBuilderFooterBarProps) {
  return (
    <div className={barWrapClass}>
      <div className={innerClass}>
        {onRevertToLastLoaded != null && (
          <button
            type="button"
            onClick={onRevertToLastLoaded}
            disabled={saving}
            className={revertToLastLoadedClass}
          >
            Reset
          </button>
        )}
        {onClearAll != null && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={saving}
            className={clearAllClass}
          >
            Clear all
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={saveClass}
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
