"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { decideChangeRequest } from "@/lib/actions/change-requests";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

/** Aprovar / Recusar with an optional short reply that the client sees in the app. */
export function DecideForm({ id }: { id: string }) {
  const [state, action] = useActionState(decideChangeRequest, undefined);
  return (
    <form action={action} className="space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center gap-2">
        <Input name="reply" maxLength={500} placeholder="Resposta ao cliente (opcional)" aria-label="Resposta ao cliente" className="h-9 flex-1 basis-56 text-sm" />
        <div className="flex gap-2">
          <SubmitButton size="sm" name="decision" value="APPROVED"><Check className="h-4 w-4" /> Aprovar</SubmitButton>
          <SubmitButton size="sm" variant="outline" name="decision" value="REJECTED"><X className="h-4 w-4" /> Recusar</SubmitButton>
        </div>
      </div>
    </form>
  );
}
