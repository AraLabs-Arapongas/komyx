"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STALE_MS = 20_000;
let lastRefresh = Date.now();

/** True while the user is typing in a form field, so a refresh would be disruptive. */
export function isEditingForm() {
  const el = document.activeElement;
  if (!el || !el.closest("form")) return false;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable;
}

/** Re-renders the current page with fresh server data, unless a form is being edited. */
export function softRefresh(router: ReturnType<typeof useRouter>) {
  if (isEditingForm()) return false;
  lastRefresh = Date.now();
  router.refresh();
  return true;
}

/** Refreshes the page when the user comes back to the tab/window after a while. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh < STALE_MS) return;
      softRefresh(router);
    };
    document.addEventListener("visibilitychange", onBack);
    window.addEventListener("focus", onBack);
    return () => {
      document.removeEventListener("visibilitychange", onBack);
      window.removeEventListener("focus", onBack);
    };
  }, [router]);
  return null;
}
