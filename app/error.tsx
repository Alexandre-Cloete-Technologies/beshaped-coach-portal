"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Sidebar from "./components/Sidebar";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Shown when a page crashes while rendering, instead of Next.js's default error screen. "Try again" re-renders
 * the page; the error is logged for debugging (an error-monitoring service would hook in here).
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[220px] min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page hit an unexpected error. Nothing you saved before this was lost. Try again, or go back to your
            dashboard.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={reset}>Try again</Button>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back to dashboard
            </Link>
          </div>
          {error.digest && <p className="mt-4 text-xs text-muted-foreground">Error reference: {error.digest}</p>}
        </div>
      </main>
    </div>
  );
}
