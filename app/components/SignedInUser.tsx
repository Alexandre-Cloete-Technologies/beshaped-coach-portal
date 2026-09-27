"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth, useSignedInCoach } from "@/lib/auth/AuthProvider";

function initialsFor(nameOrEmail: string): string {
  const base = nameOrEmail.split("@")[0];
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
}

/** Signed-in coach's name, role and a sign-out button, for the sidebar and the top navbar. */
export default function SignedInUser({ compact = false }: { compact?: boolean }) {
  const { signOutUser } = useAuth();
  const { user, role } = useSignedInCoach();
  const [signingOut, setSigningOut] = useState(false);
  const label = user.displayName || user.email || "Signed in";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${compact ? "" : "px-3 py-3 mt-2"}`}>
      <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
        <span className="text-white text-sm font-medium">{initialsFor(label)}</span>
      </div>
      <div className={`min-w-0 flex-1 ${compact ? "hidden md:block" : ""}`}>
        <p className="text-sm font-medium text-sidebar-foreground truncate" title={label}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{role === "admin" ? "Admin" : "Coach"}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        title="Sign out"
        aria-label="Sign out"
        className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
