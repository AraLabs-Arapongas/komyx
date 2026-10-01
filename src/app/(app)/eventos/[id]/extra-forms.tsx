"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addEventExtra } from "@/lib/actions/guests-payments";
import { updateInvite } from "@/lib/actions/events";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency } from "@/lib/utils";

export function ExtraForm({ eventId, addons }: { eventId: string; addons: { id: string; name: string; price: number | string }[] }) {
  const [state, action] = useActionState(addEventExtra, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [addonId, setAddonId] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset controlled inputs after a successful submit
    setAddonId(""); setDesc(""); setPrice("");
  }, [state]);

  function pick(id: string) {
    setAddonId(id);
    const a = addons.find((x) => x.id === id);
    if (a) { setDesc(a.name); setPrice(String(Number(a.price))); }
  }

  return (
    <form ref={ref} action={action} className="@container space-y-2 border-t border-border pt-3">
      <p className="text-sm font-medium">Registrar pedido extra</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="addon_id" value={addonId} />
      <div className="grid grid-cols-2 @xl:grid-cols-[150px_1fr_70px_110px_auto] gap-2 items-end">
        {addons.length > 0 ? (
          <Field label="Do catálogo" htmlFor="extra_addon">
            <Select id="extra_addon" value={addonId} onChange={(e) => pick(e.target.value)}>
              <option value="">Item livre</option>
              {addons.map((a) => <option key={a.id} value={a.id}>{a.name} · {formatCurrency(a.price)}</option>)}
            </Select>
          </Field>
        ) : null}
        <Field label="Descrição" htmlFor="extra_desc" error={fe.description}><Input id="extra_desc" name="description" value={desc} onChange={(e) => setDesc(e.target.value)} required /></Field>
        <Field label="Qtd." htmlFor="extra_qty" error={fe.quantity}><Input id="extra_qty" name="quantity" inputMode="decimal" defaultValue={1} required /></Field>
        <Field label="Unitário (R$)" htmlFor="extra_price" error={fe.unit_price}><Input id="extra_price" name="unit_price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required /></Field>
        <SubmitButton size="md" variant="secondary" className="col-span-2 @xl:col-span-1">Adicionar</SubmitButton>
      </div>
    </form>
  );
}

export function InviteForm({ eventId, title, message }: { eventId: string; title: string; message: string }) {
  const [state, action] = useActionState(updateInvite, undefined);
  return (
    <form action={action} className="space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={eventId} />
      <Field label="Título do convite" htmlFor="invite_title"><Input id="invite_title" name="invite_title" defaultValue={title} placeholder="Ex.: Você está convidado para o aniversário do Samuel!" /></Field>
      <Field label="Mensagem" htmlFor="invite_message"><Textarea id="invite_message" name="invite_message" defaultValue={message} className="min-h-14" placeholder="Ex.: Será uma aventura incrível! Confirme sua presença." /></Field>
      <div className="flex justify-end"><SubmitButton size="sm" variant="outline">Salvar convite</SubmitButton></div>
    </form>
  );
}
