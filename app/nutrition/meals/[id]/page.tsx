"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import NutritionShell, { NutritionSkeleton } from "../../components/NutritionShell";

const SavedMealEditor = dynamic(() => import("../../SavedMealEditor"), {
  ssr: false,
  loading: () => <NutritionSkeleton />,
});

export default function EditSavedMealPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <NutritionShell>
      <SavedMealEditor key={id} mealId={id} />
    </NutritionShell>
  );
}
