"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * A plain submit button (keeps the caller's classes) that locks while its form is sending, so a slow
 * response never turns into a second submit. Icon-only buttons show the spinner in place of the icon.
 */
export function PendingButton({ children, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const iconOnly = typeof children !== "string" && Boolean(props["aria-label"]) && !React.Children.toArray(children).some((c) => typeof c === "string");
  return (
    <button type="submit" {...props} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? <Loader2 className={iconOnly ? "h-4 w-4 animate-spin" : "mr-1 inline h-3.5 w-3.5 animate-spin"} /> : null}
      {pending && iconOnly ? null : children}
    </button>
  );
}
