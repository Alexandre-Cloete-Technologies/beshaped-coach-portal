"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/**
 * Small, non-blocking notifications for the whole portal (instead of the browser's alert()). Wrap the app in
 * <ToastProvider> once (app/layout.tsx); components call `const toast = useToast()` and then
 * `toast.success("Saved.")`, `toast.error("Couldn't save. Try again.")` or `toast.info(...)`.
 */

type ToastKind = "success" | "error" | "info";

type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Errors stay a little longer, so there's time to read them. */
const DURATION_MS: Record<ToastKind, number> = { success: 4000, info: 5000, error: 8000 };
const MAX_VISIBLE = 3;

const STYLE: Record<ToastKind, { icon: typeof Info; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-beshaped-green" },
  error: { icon: AlertCircle, iconClass: "text-red-400" },
  info: { icon: Info, iconClass: "text-sky-300" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, kind, message }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_MS[kind])
      );
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-6 top-16 z-[70] flex w-[min(24rem,calc(100vw-3rem))] flex-col gap-2"
      >
        {toasts.map((t) => {
          const { icon: Icon, iconClass } = STYLE[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-3 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg animate-in fade-in slide-in-from-top-2"
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`} />
              <p className="flex-1 whitespace-pre-line">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
