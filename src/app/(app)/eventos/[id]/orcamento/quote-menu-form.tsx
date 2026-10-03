"use client";

import { useActionState, useState } from "react";
import { saveQuoteMenu } from "@/lib/actions/menu";
import { MenuPicker } from "@/components/menu/menu-picker";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import type { MenuGroup, MenuPick } from "@/lib/menu";

/** Staff edits the menu picks of an open quote. */
export function QuoteMenuForm({ quoteId, eventId, groups, initial }: { quoteId: string; eventId: string; groups: MenuGroup[]; initial: MenuPick[] }) {
  const [state, action] = useActionState(saveQuoteMenu, undefined);
  const [picks, setPicks] = useState<MenuPick[]>(initial);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="menu" value={JSON.stringify(picks)} />
      <MenuPicker groups={groups} picks={picks} onChange={setPicks} />
      <SubmitButton size="sm" variant="outline" pendingText="Salvando...">Salvar cardápio</SubmitButton>
    </form>
  );
}
