"use client";

import { useActionState } from "react";
import { savePackage, saveAddon } from "@/lib/actions/settings";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

type Pkg = { id: string; name: string; base_price: number | string; included_participants: number; additional_participant_price: number | string; description: string | null };
type Addon = { id: string; name: string; price: number | string; description: string | null };

export function PackageForm({ pkg }: { pkg?: Pkg }) {
  const [state, action] = useActionState(savePackage, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const k = pkg?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <Field label="Nome" htmlFor={`pkg_name_${k}`} error={fe.name}><Input id={`pkg_name_${k}`} name="name" defaultValue={pkg?.name ?? ""} required /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Preço-base" htmlFor={`pkg_price_${k}`} error={fe.base_price}><Input id={`pkg_price_${k}`} name="base_price" inputMode="decimal" defaultValue={pkg ? Number(pkg.base_price) : ""} required /></Field>
        <Field label="Incluídos" htmlFor={`pkg_inc_${k}`} error={fe.included_participants}><Input id={`pkg_inc_${k}`} name="included_participants" type="number" min={0} defaultValue={pkg?.included_participants ?? 0} /></Field>
        <Field label="R$/extra" htmlFor={`pkg_add_${k}`} error={fe.additional_participant_price}><Input id={`pkg_add_${k}`} name="additional_participant_price" inputMode="decimal" defaultValue={pkg ? Number(pkg.additional_participant_price) : 0} /></Field>
      </div>
      <Field label="Descrição" htmlFor={`pkg_desc_${k}`}><Textarea id={`pkg_desc_${k}`} name="description" defaultValue={pkg?.description ?? ""} className="min-h-16" placeholder="O que está incluso" /></Field>
      <SubmitButton size="sm">{pkg ? "Salvar" : "Criar pacote"}</SubmitButton>
    </form>
  );
}

export function AddonForm({ addon }: { addon?: Addon }) {
  const [state, action] = useActionState(saveAddon, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const k = addon?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {addon ? <input type="hidden" name="id" value={addon.id} /> : null}
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <Field label="Nome" htmlFor={`addon_name_${k}`} error={fe.name}><Input id={`addon_name_${k}`} name="name" defaultValue={addon?.name ?? ""} required /></Field>
        <Field label="Preço" htmlFor={`addon_price_${k}`} error={fe.price}><Input id={`addon_price_${k}`} name="price" inputMode="decimal" defaultValue={addon ? Number(addon.price) : ""} required /></Field>
      </div>
      <Field label="Descrição" htmlFor={`addon_desc_${k}`}><Input id={`addon_desc_${k}`} name="description" defaultValue={addon?.description ?? ""} /></Field>
      <SubmitButton size="sm">{addon ? "Salvar" : "Criar adicional"}</SubmitButton>
    </form>
  );
}
