"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Password field with an eye button to show or hide what was typed. */
export function PasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Esconder senha" : "Mostrar senha"} aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-foreground focus:outline-none focus-visible:text-foreground">
        {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}
