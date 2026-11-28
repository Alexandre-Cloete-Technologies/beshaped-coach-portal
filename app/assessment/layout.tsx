import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assessment" };

export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
