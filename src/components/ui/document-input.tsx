"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { isValidDocument } from "@/lib/document";
import { inputBase } from "./input";

/** 000.000.000-00 up to 11 digits, 00.000.000/0000-00 above (cpf-only fields stop at 11). */
export function maskDocument(value: string, kind: "any" | "cpf" = "any") {
  const d = value.replace(/\D/g, "").slice(0, kind === "cpf" ? 11 : 14);
  if (d.length <= 11) return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

/**
 * CPF/CNPJ field: digits only, masked as typed. An invalid number (check digits) is flagged once the field
 * loses focus and blocks the browser's form submit. Uncontrolled (defaultValue + name); the server strips the mask.
 */
export function DocumentInput({ defaultValue, kind = "any", className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  defaultValue?: string | null;
  kind?: "any" | "cpf";
}) {
  const [shown, setShown] = React.useState(() => maskDocument(defaultValue ?? "", kind));
  const [touched, setTouched] = React.useState(false);
  const message = kind === "cpf" ? "CPF inválido: confira os números." : "CPF ou CNPJ inválido: confira os números.";
  const invalid = shown !== "" && !(kind === "cpf" ? shown.replace(/\D/g, "").length === 11 && isValidDocument(shown) : isValidDocument(shown));
  return (
    <>
      <input type="text" inputMode="numeric" autoComplete="off" placeholder={kind === "cpf" ? "000.000.000-00" : "00.000.000/0000-00 ou 000.000.000-00"} maxLength={kind === "cpf" ? 14 : 18} {...props} value={shown}
        aria-invalid={touched && invalid ? true : undefined}
        ref={(el) => el?.setCustomValidity(invalid ? message : "")}
        onChange={(e) => setShown(maskDocument(e.target.value, kind))}
        onBlur={(e) => { setTouched(true); props.onBlur?.(e); }}
        className={cn(inputBase, "h-11 tabular-nums", touched && invalid && "border-red-500 focus:ring-red-500/30 focus:border-red-500", className)} />
      {touched && invalid ? <p className="mt-1 text-sm text-red-600">{message}</p> : null}
    </>
  );
}
