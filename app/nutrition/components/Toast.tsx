"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastMessage {
  message: string;
  action?: { label: string; onClick: () => void };
}

const TOAST_TIMEOUT_MS = 6000;

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((next: ToastMessage) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { toast, show, dismiss };
}

export default function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 pl-[220px]"
    >
      {toast && (
        <div className="pointer-events-auto flex items-center gap-4 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="font-semibold text-beshaped-green hover:underline focus-visible:outline-none focus-visible:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
