"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function SubmitButton({ children, pendingText, disabled, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} disabled={pending || disabled}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
