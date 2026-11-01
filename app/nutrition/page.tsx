"use client";

import dynamic from "next/dynamic";
import NutritionShell, { NutritionSkeleton } from "./components/NutritionShell";

const NutritionLibrary = dynamic(() => import("./NutritionLibrary"), {
  ssr: false,
  loading: () => <NutritionSkeleton />,
});

export default function NutritionPage() {
  return (
    <NutritionShell>
      <NutritionLibrary />
    </NutritionShell>
  );
}
