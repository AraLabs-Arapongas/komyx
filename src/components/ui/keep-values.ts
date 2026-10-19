"use client";

import { useEffect, useRef } from "react";

/**
 * React resets an uncontrolled <form action> after every submit, so on a validation error the fields go
 * back to their defaultValue and the person loses what they typed. Pass the action state; spread the
 * returned props on the <form>. On an error the submitted text values are put back.
 */
export function useKeepValuesOnError(state: { ok: boolean } | undefined) {
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef<[string, string][]>([]);
  useEffect(() => {
    if (!state || state.ok || !form.current) return;
    for (const [name, value] of sent.current) {
      const el = form.current.elements.namedItem(name);
      if (el instanceof HTMLInputElement && el.type !== "checkbox" && el.type !== "radio" && el.type !== "file" && el.type !== "hidden") el.value = value;
      else if (el instanceof HTMLTextAreaElement) el.value = value;
    }
  }, [state]);
  return {
    ref: form,
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      sent.current = [...new FormData(e.currentTarget).entries()].filter((x): x is [string, string] => typeof x[1] === "string");
    },
  };
}
