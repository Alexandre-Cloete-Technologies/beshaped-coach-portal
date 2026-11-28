import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import Sidebar from "./components/Sidebar";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

/** Shown for any URL that doesn't match a page (and when a page calls notFound()). */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <SearchX className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page doesn&apos;t exist or has moved. Check the link, or head back to your dashboard.
          </p>
          <Link href="/" className={buttonVariants({ className: "mt-6" })}>
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
