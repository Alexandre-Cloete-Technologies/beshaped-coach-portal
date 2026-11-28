import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workouts" };

export default function WorkoutsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
