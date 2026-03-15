"use client";

interface PhaseDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  placeholder?: string;
}

export default function PhaseDescriptionModal({
  isOpen,
  onClose,
  title,
  subtitle = "Describe the focus and goals for this phase",
  value,
  onChange,
  onSave,
  placeholder = "Define the focus for this phase...",
}: PhaseDescriptionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border px-6 py-4 shrink-0">
          <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className="px-6 py-4 flex-1 min-h-0 overflow-hidden">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            className="w-full h-full min-h-[320px] px-4 py-3 text-sm border border-border rounded-lg bg-muted/30 focus:ring-2 focus:ring-ring focus:border-transparent resize-y"
            placeholder={placeholder}
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium border border-border bg-card text-card-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
