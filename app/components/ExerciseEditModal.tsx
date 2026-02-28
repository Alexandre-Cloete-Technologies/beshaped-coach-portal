"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Difficulty = "beginner" | "intermediate" | "advanced";

export interface ExerciseEditValues {
  name: string;
  description: string;
  muscleGroup: string;
  equipment: string;
  difficulty: Difficulty;
  videoUrl: string;
}

interface ExerciseSummary {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  difficulty: Difficulty;
  description?: string;
  videoUrl?: string;
}

interface ExerciseEditModalProps {
  isOpen: boolean;
  exercise: ExerciseSummary | null;
  muscleGroupOrder: string[];
  saving?: boolean;
  onClose: () => void;
  onSave: (values: ExerciseEditValues) => void;
}

export default function ExerciseEditModal({
  isOpen,
  exercise,
  muscleGroupOrder,
  saving = false,
  onClose,
  onSave,
}: ExerciseEditModalProps) {
  const [form, setForm] = useState<ExerciseEditValues>({
    name: "",
    description: "",
    muscleGroup: muscleGroupOrder[0] || "Other",
    equipment: "",
    difficulty: "intermediate",
    videoUrl: "",
  });

  useEffect(() => {
    if (!isOpen || !exercise) return;

    setForm({
      name: exercise.name || "",
      description: exercise.description || "",
      muscleGroup: muscleGroupOrder.includes(exercise.muscleGroup)
        ? exercise.muscleGroup
        : "Other",
      equipment: exercise.equipment || "",
      difficulty: exercise.difficulty || "intermediate",
      videoUrl: exercise.videoUrl || "",
    });
  }, [isOpen, exercise, muscleGroupOrder]);

  if (!isOpen || !exercise) return null;

  const handleChange = <K extends keyof ExerciseEditValues>(
    field: K,
    value: ExerciseEditValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("Please enter an exercise name");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-border max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Edit Exercise
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updating: {exercise.name}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-card-foreground mb-2">
              Exercise Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="Exercise name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-card-foreground mb-2">
                Muscle Group
              </label>
              <select
                value={form.muscleGroup}
                onChange={(e) => handleChange("muscleGroup", e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              >
                {muscleGroupOrder.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-card-foreground mb-2">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  handleChange(
                    "difficulty",
                    e.target.value as Difficulty
                  )
                }
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground mb-2">
              Equipment
            </label>
            <input
              type="text"
              value={form.equipment}
              onChange={(e) => handleChange("equipment", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="e.g., Barbell, Dumbbells"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground mb-2">
              Video URL
            </label>
            <input
              type="url"
              value={form.videoUrl}
              onChange={(e) => handleChange("videoUrl", e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
              placeholder="Brief description of the exercise..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="h-10 px-5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

