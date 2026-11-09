"use client";

import dynamic from "next/dynamic";
import NutritionShell, { NutritionSkeleton } from "../components/NutritionShell";

const SavedMealsLibrary = dynamic(() => import("../SavedMealsLibrary"), {
  ssr: false,
  loading: () => <NutritionSkeleton />,
});

export default function SavedMealsPage() {
  return (
    <NutritionShell>
      <SavedMealsLibrary />
    </NutritionShell>
  );
}
