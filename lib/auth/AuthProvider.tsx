"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { logout } from "@/lib/firebase/auth";
import { clearClientProfilePhotoCache } from "@/lib/clientProfilePhotoCache";

/**
 * Portal roles come from the Firebase Auth custom claim `role` (set by BSF-81's script, later by
 * BSF-75 on sign-up). `users.role` in Firestore is not trusted for access.
 */
export type PortalRole = "coach" | "admin";

/** Why the user is signed out, so /login can say something useful. */
export type SignedOutReason = "no-role" | "signed-out" | "error" | null;

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut"; reason: SignedOutReason }
  | { status: "signedIn"; user: User; role: PortalRole };

type AuthContextValue = {
  state: AuthState;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function portalRole(value: unknown): PortalRole | null {
  return value === "coach" || value === "admin" ? value : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  // Set just before we sign someone out, read when the signed-out event arrives.
  const pendingReason = useRef<SignedOutReason>(null);
  // Force-refresh a token at most once per uid, so a missing claim set after the token was issued
  // is picked up without looping on onIdTokenChanged.
  const refreshedFor = useRef<string | null>(null);
  // Bumped on every auth event. A role check that finds a newer event has started (e.g. the one its
  // own forced token refresh fires) stops, so only one check per sign-in can sign the user out.
  const latestEvent = useRef(0);

  useEffect(() => {
    // onIdTokenChanged (not onAuthStateChanged) also fires on the hourly token refresh,
    // so a role that's removed takes effect without a reload.
    return onIdTokenChanged(auth, async (user) => {
      const eventId = ++latestEvent.current;
      const isStale = () => eventId !== latestEvent.current;

      if (!user) {
        refreshedFor.current = null;
        clearClientProfilePhotoCache();
        const reason = pendingReason.current;
        pendingReason.current = null;
        // signOut() notifies token listeners even when nobody is signed in, so a repeat event with
        // no new reason must not wipe the message that's already showing.
        setState((prev) =>
          prev.status === "signedOut" && reason === null ? prev : { status: "signedOut", reason }
        );
        return;
      }

      // Keep the page mounted on routine token refreshes for the same user.
      setState((prev) =>
        prev.status === "signedIn" && prev.user.uid === user.uid ? prev : { status: "loading" }
      );

      try {
        let role = portalRole((await user.getIdTokenResult()).claims.role);
        if (!role && refreshedFor.current !== user.uid) {
          refreshedFor.current = user.uid;
          role = portalRole((await user.getIdTokenResult(true)).claims.role);
        }
        if (isStale() || auth.currentUser?.uid !== user.uid) return; // a newer auth event takes over

        if (role) {
          setState({ status: "signedIn", user, role });
        } else {
          pendingReason.current = "no-role";
          await logout();
        }
      } catch (err) {
        if (isStale()) return;
        console.error("Error checking portal role:", err);
        pendingReason.current = "error";
        await logout().catch(() => {});
      }
    });
  }, []);

  const signOutUser = useCallback(async () => {
    pendingReason.current = "signed-out";
    await logout();
  }, []);

  const value = useMemo(() => ({ state, signOutUser }), [state, signOutUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The signed-in coach/admin. Only call below <AuthGuard>, which renders nothing until this exists. */
export function useSignedInCoach(): { user: User; uid: string; role: PortalRole } {
  const { state } = useAuth();
  if (state.status !== "signedIn") {
    throw new Error("useSignedInCoach called outside a signed-in route");
  }
  return { user: state.user, uid: state.user.uid, role: state.role };
}
