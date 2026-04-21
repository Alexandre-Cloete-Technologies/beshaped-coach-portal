"use client";

import type { BreadcrumbItem } from "./Breadcrumbs";
import WorkoutEditorView from "./WorkoutEditorView";
import {
  useWorkoutEditor,
  type CreateWorkoutExercise,
  type InitialExerciseRef,
} from "../workouts/lib/useWorkoutEditor";

export type {
  CreateWorkoutExercise,
  InitialExerciseRef,
} from "../workouts/lib/useWorkoutEditor";
export {
  toCreateWorkoutExercise,
  targetSetsFromForm,
} from "../workouts/lib/useWorkoutEditor";

export type CreateWorkoutPageProps = {
  initialWorkoutName?: string;
  initialExercises?: CreateWorkoutExercise[];
  /**
   * Lightweight refs hydrated against the exercise library once it loads.
   * Use this when you only have saved rows (e.g. from a workout doc) and
   * don't want to refetch the library yourself.
   */
  initialExerciseRefs?: InitialExerciseRef[];
  /** If provided, save updates this workout doc instead of creating a new one. */
  existingWorkoutId?: string;
  heading?: string;
  submitLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  redirectTo?: string;
};

export default function CreateWorkoutPage({
  initialWorkoutName,
  initialExercises,
  initialExerciseRefs,
  existingWorkoutId,
  heading,
  submitLabel,
  breadcrumbs,
  redirectTo,
}: CreateWorkoutPageProps = {}) {
  const editor = useWorkoutEditor({
    initialWorkoutName,
    initialExercises,
    initialExerciseRefs,
    existingWorkoutId,
    redirectTo,
  });

  return (
    <WorkoutEditorView
      {...editor}
      heading={heading}
      submitLabel={submitLabel}
      breadcrumbs={breadcrumbs}
    />
  );
}
