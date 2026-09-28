"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FirebaseError } from "firebase/app";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { useAuth, type AuthState } from "@/lib/auth/AuthProvider";
import { FullScreenLoader, safeNextPath } from "@/lib/auth/AuthGuard";

const REASON_MESSAGES = {
  "no-role":
    "This account doesn't have access to the coach portal. If you're a coach, ask Dewald to enable your account.",
  error: "We couldn't verify your access. Check your connection and try again.",
} as const;

function signInErrorMessage(err: unknown): string {
  const code = err instanceof FirebaseError ? err.code : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes, or reset your password.";
    case "auth/network-request-failed":
      return "Can't reach the server. Check your connection and try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

function LoginForm() {
  const { state } = useAuth();
  const router = useRouter();
  const nextPath = safeNextPath(useSearchParams().get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The auth state when the last sign-in started. Any newer auth state is the result of that attempt.
  const [attemptState, setAttemptState] = useState<AuthState | null>(null);

  useEffect(() => {
    if (state.status === "signedIn") router.replace(nextPath);
  }, [state.status, nextPath, router]);

  if (state.status === "signedIn") return <FullScreenLoader label="Signing you in…" />;

  // Hide an old sign-out reason once a new attempt starts; a fresh one (e.g. the role check just failed) shows.
  const reason =
    state.status === "signedOut" && state !== attemptState && (state.reason === "no-role" || state.reason === "error")
      ? REASON_MESSAGES[state.reason]
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setAttemptState(state);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // AuthProvider now checks the role claim; the effects above redirect or show the reason.
    } catch (err) {
      setError(signInErrorMessage(err));
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above, then choose \"Forgot password?\" again.");
      return;
    }
    try {
      await resetPassword(trimmed);
    } catch (err) {
      if (err instanceof FirebaseError && err.code === "auth/invalid-email") {
        setError("Enter a valid email address.");
        return;
      }
      // Other errors (e.g. unknown email) get the same notice, so this can't be used to probe accounts.
    }
    setNotice(`If an account exists for ${trimmed}, we've sent a password reset link to it.`);
  };

  // Busy until the attempt produces a new auth state (signed in, or signed out with a reason).
  const busy = state.status === "loading" || (submitting && state === attemptState);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Image src="/logotwo.png" alt="Company logo" width={40} height={40} className="h-auto w-full object-contain" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-base leading-tight">BeShaped Fitness</h1>
            <span className="text-xs text-muted-foreground">Coach Portal</span>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-card-foreground">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Use your coach account.</p>

          {reason && (
            <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
              {reason}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-900/20 dark:text-emerald-300">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-card-foreground mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-xs font-medium text-card-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3 pr-10 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-lg bg-beshaped-dark-green text-primary-foreground text-sm font-medium hover:bg-beshaped-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary for static rendering.
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <LoginForm />
    </Suspense>
  );
}
