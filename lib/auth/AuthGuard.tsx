"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/** Routes anyone can open. Everything else needs a signed-in coach or admin. */
const PUBLIC_PATHS = new Set(["/login"]);

export function isPublicPath(pathname: string | null): boolean {
  return pathname != null && PUBLIC_PATHS.has(pathname);
}

/** Only same-origin paths, never back to /login, so ?next= can't be used as an open redirect. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next === "/login" || next.startsWith("/login?")) return "/";
  return next;
}

export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

/**
 * Renders protected pages only once a user with a valid role claim is known. While auth loads, or
 * while redirecting, it renders a loader, so no protected content (or its Firestore reads) runs early.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (isPublic || state.status !== "signedOut") return;
    // After a deliberate sign-out, don't send them back to the page they left.
    if (state.reason === "signed-out") {
      router.replace("/login");
      return;
    }
    const target = `${pathname ?? "/"}${window.location.search}`;
    router.replace(target === "/" ? "/login" : `/login?next=${encodeURIComponent(target)}`);
  }, [isPublic, state, pathname, router]);

  if (isPublic) return <>{children}</>;
  if (state.status === "signedIn") return <>{children}</>;
  return <FullScreenLoader label={state.status === "loading" ? "Checking your session…" : "Redirecting to sign in…"} />;
}
