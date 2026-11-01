"use client";

import dynamic from "next/dynamic";
import NutritionShell, { NutritionSkeleton } from "../components/NutritionShell";

const NutritionBuilder = dynamic(() => import("../NutritionBuilder"), {
  ssr: false,
  loading: () => <NutritionSkeleton />,
});

export default function NewNutritionPlanPage() {
  return (
    <NutritionShell>
      <NutritionBuilder />
    </NutritionShell>
  );
}
