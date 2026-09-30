"use client";

import { useActionState } from "react";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { LEAD_SOURCES } from "@/lib/pricing";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import type { ActionResult } from "@/lib/action-result";

type Customer = { id?: string; name: string; whatsapp: string; email: string | null; notes: string | null; document?: string | null; source?: string | null };

export function CustomerForm({ customer, returnTo }: { customer?: Customer; returnTo?: string }) {
  const isEdit = Boolean(customer?.id);
  const [state, action] = useActionState<ActionResult<{ id: string }> | ActionResult | undefined, FormData>(
    isEdit ? (updateCustomer as never) : (createCustomer as never),
    undefined,
  );
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {customer?.id ? <input type="hidden" name="id" value={customer.id} /> : null}
      {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
      <Card>
        <CardBody className="pt-4 space-y-4">
          <Field label="Nome" htmlFor="name" error={fe.name}><Input id="name" name="name" defaultValue={customer?.name ?? ""} required /></Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp} hint="DDD + número"><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={customer?.whatsapp ?? ""} required /></Field>
          <Field label="E-mail (opcional)" htmlFor="email" error={fe.email}><Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF (para contrato)" htmlFor="document"><Input id="document" name="document" defaultValue={customer?.document ?? ""} placeholder="CPF 000.000.000-00" /></Field>
            <Field label="Origem" htmlFor="source">
              <Select id="source" name="source" defaultValue={customer?.source ?? ""}>
                <option value="">Não informado</option>
                {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Observações" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} /></Field>
        </CardBody>
      </Card>
      <SubmitButton size="lg" className="w-full" pendingText="Salvando...">{isEdit ? "Salvar alterações" : "Criar cliente"}</SubmitButton>
    </form>
  );
}
