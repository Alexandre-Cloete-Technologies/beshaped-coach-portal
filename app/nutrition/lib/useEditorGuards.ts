import { useEffect } from "react";

/** Ctrl+S / Cmd+S calls `save`. Re-subscribes every render so it always sees the latest state. */
export function useSaveShortcut(save: () => void) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });
}

/** Warns before leaving with unsaved changes, by reload or tab close and by in-app link clicks. */
export function useUnsavedChangesWarning(isDirty: boolean, message: string) {
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    // Client-side <Link> navigation doesn't fire beforeunload, so intercept link clicks too.
    const onLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, [isDirty, message]);
}
