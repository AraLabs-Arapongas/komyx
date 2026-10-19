"use client";

import * as React from "react";
import { cn, isValidPhone, maskPhone } from "@/lib/utils";
import { inputBase } from "./input";

const INVALID = "Número inválido. Use DDD + número, ex.: (11) 99999-9999.";

/**
 * WhatsApp field with the (11) 99999-9999 mask. Controlled (value + onValue) or uncontrolled (defaultValue + name);
 * the server strips the mask. A number that is not a real Brazilian one is flagged once the field loses focus
 * and blocks the browser's form submit.
 */
export function PhoneInput({ value, defaultValue, onValue, className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  value?: string;
  defaultValue?: string | null;
  onValue?: (masked: string) => void;
}) {
  const [inner, setInner] = React.useState(() => maskPhone(defaultValue ?? ""));
  const [touched, setTouched] = React.useState(false);
  const input = React.useRef<HTMLInputElement | null>(null);
  // form.reset() ("Descartar") only resets uncontrolled fields: put the saved value back here too.
  React.useEffect(() => {
    const form = input.current?.form;
    if (!form || value !== undefined) return;
    const onReset = () => { setInner(maskPhone(defaultValue ?? "")); setTouched(false); };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, value]);
  const shown = value !== undefined ? maskPhone(value) : inner;
  const invalid = shown !== "" && !isValidPhone(shown);
  return (
    <>
      <input type="tel" inputMode="tel" placeholder="(11) 99999-9999" maxLength={15} {...props} value={shown}
        aria-invalid={touched && invalid ? true : undefined}
        ref={(el) => { input.current = el; el?.setCustomValidity(invalid ? INVALID : ""); }}
        onChange={(e) => { const m = maskPhone(e.target.value); if (value === undefined) setInner(m); onValue?.(m); }}
        onBlur={(e) => { setTouched(true); props.onBlur?.(e); }}
        className={cn(inputBase, "h-11 tabular-nums", touched && invalid && "border-red-500 focus:ring-red-500/30 focus:border-red-500", className)} />
      {touched && invalid ? <p className="mt-1 text-sm text-red-600">{INVALID}</p> : null}
    </>
  );
}
