"use client";

import { useActionState } from "react";
import { updateOrganization, uploadOrgImage, createStaff } from "@/lib/actions/settings";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

type Org = {
  name: string; slug: string; whatsapp: string | null; address: string | null; instagram: string | null; description: string | null;
  default_event_duration_minutes: number; pre_reservation_validity_hours: number;
};

export function OrganizationForm({ org }: { org: Org }) {
  const [state, action] = useActionState(updateOrganization, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Field label="Nome do buffet" htmlFor="org_name" error={fe.name}><Input id="org_name" name="name" defaultValue={org.name} required /></Field>
      <Field label="Endereço público (slug)" htmlFor="slug" error={fe.slug} hint="Só letras minúsculas, números e hífens. Ex.: festa-e-cia"><Input id="slug" name="slug" defaultValue={org.slug} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="WhatsApp" htmlFor="org_whatsapp" error={fe.whatsapp}><Input id="org_whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={org.whatsapp ?? ""} /></Field>
        <Field label="Instagram" htmlFor="instagram" error={fe.instagram}><Input id="instagram" name="instagram" defaultValue={org.instagram ?? ""} placeholder="@seubuffet" /></Field>
      </div>
      <Field label="Endereço" htmlFor="address"><Input id="address" name="address" defaultValue={org.address ?? ""} /></Field>
      <Field label="Descrição" htmlFor="description"><Textarea id="description" name="description" defaultValue={org.description ?? ""} placeholder="Conte em poucas linhas o que torna seu buffet especial." /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duração padrão (min)" htmlFor="duration" error={fe.default_event_duration_minutes}><Input id="duration" name="default_event_duration_minutes" type="number" min={30} max={1440} step={30} defaultValue={org.default_event_duration_minutes} required /></Field>
        <Field label="Validade pré-reserva (h)" htmlFor="validity" error={fe.pre_reservation_validity_hours}><Input id="validity" name="pre_reservation_validity_hours" type="number" min={1} max={720} defaultValue={org.pre_reservation_validity_hours} required /></Field>
      </div>
      <SubmitButton pendingText="Salvando...">Salvar dados</SubmitButton>
    </form>
  );
}

export function ImageUploadForm({ kind, currentUrl }: { kind: "logo" | "cover"; currentUrl: string | null }) {
  const [state, action] = useActionState(uploadOrgImage, undefined);
  return (
    <form action={action} className="space-y-2">
      <p className="text-sm font-medium">{kind === "logo" ? "Logo" : "Capa"}</p>
      {currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="" className={kind === "logo" ? "h-20 w-20 rounded-xl object-cover border border-border" : "h-20 w-full rounded-xl object-cover border border-border"} />
      ) : <div className="h-20 rounded-xl border border-dashed border-border grid place-items-center text-xs text-muted">Sem imagem</div>}
      <input type="hidden" name="kind" value={kind} />
      <input name="file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-brand file:font-medium" required />
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <SubmitButton size="sm" variant="outline" pendingText="Enviando...">Enviar</SubmitButton>
    </form>
  );
}

export function StaffForm() {
  const [state, action] = useActionState(createStaff, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-medium">Adicionar pessoa da equipe</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" htmlFor="staff_name" error={fe.name}><Input id="staff_name" name="name" required /></Field>
        <Field label="E-mail" htmlFor="staff_email" error={fe.email}><Input id="staff_email" name="email" type="email" required /></Field>
      </div>
      <Field label="Senha inicial" htmlFor="staff_password" error={fe.password} hint="Mínimo de 8 caracteres. A pessoa pode trocar depois."><Input id="staff_password" name="password" type="text" autoComplete="off" minLength={8} required /></Field>
      <SubmitButton size="sm" variant="secondary">Criar acesso</SubmitButton>
    </form>
  );
}
