"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { updateCustomer } from "@/lib/actions/customers";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { LEAD_SOURCES, leadSourceLabel } from "@/lib/pricing";
import { formatPhone } from "@/lib/utils";

type Customer = { id: string; name: string; whatsapp: string; email: string | null; notes: string | null; document: string | null; source: string | null };

/** Read mode by default; "Editar dados" switches to the form. CPF only shows while editing (it belongs to the contract flow). */
export function CustomerDetails({ customer, startEditing = false }: { customer: Customer; startEditing?: boolean }) {
  const [editing, setEditing] = useState(startEditing);
  const [state, action] = useActionState(updateCustomer, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leave edit mode after a successful save
    if (state?.ok) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <Card id="dados">
        <CardHeader title="Dados do cliente" action={<button type="button" onClick={() => setEditing(true)} className={buttonClass("outline", "sm")}><Pencil className="h-4 w-4" /> Editar dados</button>} />
        <CardBody>
          {state?.ok && state.message ? <div className="mb-3"><Alert tone="success">{state.message}</Alert></div> : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div><dt className="text-muted text-xs">Nome</dt><dd className="font-medium">{customer.name}</dd></div>
            <div><dt className="text-muted text-xs">WhatsApp</dt><dd className="font-medium">{formatPhone(customer.whatsapp)}</dd></div>
            <div><dt className="text-muted text-xs">E-mail</dt><dd className="font-medium">{customer.email || "—"}</dd></div>
            <div><dt className="text-muted text-xs">Origem</dt><dd className="font-medium">{customer.source ? leadSourceLabel(customer.source) : "—"}</dd></div>
            <div className="col-span-2"><dt className="text-muted text-xs">Observações gerais</dt><dd className="whitespace-pre-wrap">{customer.notes || "—"}</dd></div>
          </dl>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card id="dados">
      <CardHeader title="Dados do cliente" subtitle="Dados da festa (tema, alergias, aniversariante) ficam no evento, não aqui." />
      <CardBody>
        <form action={action} className="space-y-4">
          {state && !state.ok ? <Alert>{state.error}</Alert> : null}
          <input type="hidden" name="id" value={customer.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome" htmlFor="name" error={fe.name}><Input id="name" name="name" defaultValue={customer.name} required /></Field>
            <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp} hint="DDD + número"><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={customer.whatsapp} required /></Field>
            <Field label="E-mail (opcional)" htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" defaultValue={customer.email ?? ""} /></Field>
            <Field label="Origem" htmlFor="source">
              <Select id="source" name="source" defaultValue={customer.source ?? ""}>
                <option value="">Não informado</option>
                {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="CPF (só para o contrato)" htmlFor="document"><Input id="document" name="document" defaultValue={customer.document ?? ""} placeholder="000.000.000-00" /></Field>
          </div>
          <Field label="Observações gerais" htmlFor="notes" hint="Preferências de contato, como conheceu o buffet, etc."><Textarea id="notes" name="notes" defaultValue={customer.notes ?? ""} /></Field>
          <div className="flex gap-2">
            <SubmitButton size="md" pendingText="Salvando...">Salvar alterações</SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className={buttonClass("ghost", "md")}>Cancelar</button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
