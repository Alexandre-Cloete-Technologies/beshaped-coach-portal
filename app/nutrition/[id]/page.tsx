"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import NutritionShell, { NutritionSkeleton } from "../components/NutritionShell";

const NutritionBuilder = dynamic(() => import("../NutritionBuilder"), {
  ssr: false,
  loading: () => <NutritionSkeleton />,
});

export default function EditNutritionPlanPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <NutritionShell>
      <NutritionBuilder key={id} planId={id} />
    </NutritionShell>
  );
}
