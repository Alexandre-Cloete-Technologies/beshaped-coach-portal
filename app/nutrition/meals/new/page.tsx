"use client";

import dynamic from "next/dynamic";
import NutritionShell, { NutritionSkeleton } from "../../components/NutritionShell";

const SavedMealEditor = dynamic(() => import("../../SavedMealEditor"), {
  ssr: false,
  loading: () => <NutritionSkeleton />,
});

export default function NewSavedMealPage() {
  return (
    <NutritionShell>
      <SavedMealEditor />
    </NutritionShell>
  );
}
