import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exercises" };

export default function ExercisesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
