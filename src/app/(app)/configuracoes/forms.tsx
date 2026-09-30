"use client";

import { useActionState } from "react";
import { useState } from "react";
import { updateOrganization, uploadOrgImage, createStaff, updatePaymentPlan, updateContractTemplate } from "@/lib/actions/settings";
import { Trash2 } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

type Org = {
  name: string; slug: string; whatsapp: string | null; address: string | null; instagram: string | null; description: string | null;
  default_event_duration_minutes: number; pre_reservation_validity_hours: number;
  legal_name: string | null; document: string | null; city: string | null; pix_key: string | null;
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Razão social" htmlFor="legal_name"><Input id="legal_name" name="legal_name" defaultValue={org.legal_name ?? ""} /></Field>
        <Field label="CNPJ / CPF" htmlFor="document"><Input id="document" name="document" defaultValue={org.document ?? ""} placeholder="CNPJ 00.000.000/0001-00" /></Field>
        <Field label="Cidade / UF (foro)" htmlFor="city"><Input id="city" name="city" defaultValue={org.city ?? ""} placeholder="São Paulo/SP" /></Field>
        <Field label="Chave Pix" htmlFor="pix_key"><Input id="pix_key" name="pix_key" defaultValue={org.pix_key ?? ""} /></Field>
      </div>
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

type PlanItem = { label: string; percent: number; rule: "ON_ACCEPT" | "DAYS_BEFORE_EVENT" | "FIXED_DATE"; days_before: number | null };

export function PaymentPlanForm({ plan }: { plan: PlanItem[] }) {
  const [state, action] = useActionState(updatePaymentPlan, undefined);
  const [rows, setRows] = useState<PlanItem[]>(plan.length ? plan : [{ label: "Sinal na aceitação", percent: 30, rule: "ON_ACCEPT", days_before: null }, { label: "Saldo", percent: 70, rule: "DAYS_BEFORE_EVENT", days_before: 7 }]);
  const sum = rows.reduce((a, r) => a + (Number(r.percent) || 0), 0);
  const update = (i: number, patch: Partial<PlanItem>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_70px_auto] gap-2 items-end rounded-xl border border-border p-2">
          <Field label="Parcela" htmlFor={`plan_label_${i}`}><Input id={`plan_label_${i}`} name="label" value={r.label} onChange={(e) => update(i, { label: e.target.value })} /></Field>
          <Field label="%" htmlFor={`plan_pct_${i}`}><Input id={`plan_pct_${i}`} name="percent" inputMode="decimal" value={r.percent} onChange={(e) => update(i, { percent: Number(e.target.value) })} /></Field>
          <button type="button" onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))} className="h-11 w-11 grid place-items-center text-muted hover:text-red-600" aria-label="Remover parcela"><Trash2 className="h-4 w-4" /></button>
          <div className="col-span-3 grid grid-cols-[1fr_110px] gap-2">
            <Select name="rule" value={r.rule} onChange={(e) => update(i, { rule: e.target.value as PlanItem["rule"] })}>
              <option value="ON_ACCEPT">No aceite do orçamento</option>
              <option value="DAYS_BEFORE_EVENT">X dias antes da festa</option>
            </Select>
            <Input name="days_before" type="number" min={0} placeholder="dias" value={r.rule === "DAYS_BEFORE_EVENT" ? r.days_before ?? 0 : ""} disabled={r.rule !== "DAYS_BEFORE_EVENT"} onChange={(e) => update(i, { days_before: Number(e.target.value) })} />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setRows((x) => [...x, { label: `Parcela ${x.length + 1}`, percent: 0, rule: "DAYS_BEFORE_EVENT", days_before: 30 }])} className="text-sm text-brand font-medium">+ Adicionar parcela</button>
        <span className={sum === 100 ? "text-sm text-emerald-700" : "text-sm text-red-600"}>Soma: {sum}%</span>
      </div>
      <SubmitButton size="sm">Salvar plano</SubmitButton>
    </form>
  );
}

export function ContractTemplateForm({ template }: { template: string }) {
  const [state, action] = useActionState(updateContractTemplate, undefined);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Textarea name="contract_template" defaultValue={template} className="min-h-96 font-mono text-xs leading-relaxed" />
      <SubmitButton size="sm">Salvar modelo</SubmitButton>
    </form>
  );
}
