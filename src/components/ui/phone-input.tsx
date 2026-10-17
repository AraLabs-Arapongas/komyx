"use client";

import * as React from "react";
import { cn, maskPhone } from "@/lib/utils";
import { inputBase } from "./input";

/** WhatsApp field with the (11) 99999-9999 mask. Controlled (value + onValue) or uncontrolled (defaultValue + name); the server strips the mask. */
export function PhoneInput({ value, defaultValue, onValue, className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  value?: string;
  defaultValue?: string | null;
  onValue?: (masked: string) => void;
}) {
  const [inner, setInner] = React.useState(() => maskPhone(defaultValue ?? ""));
  const shown = value !== undefined ? maskPhone(value) : inner;
  return (
    <input type="tel" inputMode="tel" placeholder="(11) 99999-9999" maxLength={15} {...props} value={shown}
      onChange={(e) => { const m = maskPhone(e.target.value); if (value === undefined) setInner(m); onValue?.(m); }}
      className={cn(inputBase, "h-11 tabular-nums", className)} />
  );
}
