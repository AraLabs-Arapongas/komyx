"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that disables itself while its form is sending. With several submit buttons in one form
 * (name + value), only the one that was clicked shows the spinner; the others are just disabled.
 */
export function SubmitButton({ children, pendingText, disabled, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && (!props.name || data?.get(props.name) === String(props.value ?? ""));
  return (
    <Button type="submit" {...props} disabled={pending || disabled}>
      {mine ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {mine && pendingText ? pendingText : children}
    </Button>
  );
}
