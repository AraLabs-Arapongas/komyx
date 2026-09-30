"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createEvent } from "@/lib/actions/events";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatPhone } from "@/lib/utils";
import { CustomerPicker } from "@/components/events/customer-picker";

type Props = {
  packages: { id: string; name: string; base_price: number | string }[];
  customer: { id: string; name: string; whatsapp: string } | null;
  request: { id: string; name: string; whatsapp: string; participants: number | null; message: string | null } | null;
  defaults: { date: string; start: string; durationMinutes: number };
};

function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function NewEventForm({ packages, customer, request, defaults }: Props) {
  const [state, action] = useActionState(createEvent, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(addMinutesToTime(defaults.start, defaults.durationMinutes));
  const [selectedCustomer, setSelectedCustomer] = useState(customer);
  const endMin = useMemo(() => addMinutesToTime(start, 30), [start]);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {request ? <input type="hidden" name="request_id" value={request.id} /> : null}

      <Card>
        <CardBody className="pt-4 space-y-4">
          <h2 className="font-semibold">Responsável</h2>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-border px-3 py-2.5">
              <div>
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted">{formatPhone(selectedCustomer.whatsapp)}</p>
              </div>
              <input type="hidden" name="customer_id" value={selectedCustomer.id} />
              <button type="button" className="text-sm text-brand font-medium" onClick={() => setSelectedCustomer(null)}>Trocar</button>
            </div>
          ) : (
            <>
              <CustomerPicker onSelect={(c) => setSelectedCustomer(c)} />
              <Field label="Nome do responsável" htmlFor="customer_name" error={fe.customer_name}>
                <Input id="customer_name" name="customer_name" defaultValue={request?.name ?? ""} autoComplete="off" required />
              </Field>
              <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp} hint="DDD + número. Se já existir cliente com este número, ele será reaproveitado.">
                <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={request?.whatsapp ?? ""} placeholder="(11) 99999-9999" required />
              </Field>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4 space-y-4">
          <h2 className="font-semibold">Data e horário</h2>
          <Field label="Data" htmlFor="date" error={fe.date}>
            <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início" htmlFor="start_time" error={fe.start_time}>
              <Input id="start_time" name="start_time" type="time" value={start} step={900} required
                onChange={(e) => { const v = e.target.value; setStart(v); if (v) setEnd(addMinutesToTime(v, defaults.durationMinutes)); }} />
            </Field>
            <Field label="Fim" htmlFor="end_time" error={fe.end_time}>
              <Input id="end_time" name="end_time" type="time" value={end} min={endMin} step={900} required onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4 space-y-4">
          <h2 className="font-semibold">Detalhes <span className="text-muted font-normal text-sm">(opcional)</span></h2>
          <Field label="Nome do evento" htmlFor="title">
            <Input id="title" name="title" placeholder="Ex.: Aniversário da Júlia" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Participantes" htmlFor="estimated_participants" error={fe.estimated_participants}>
              <Input id="estimated_participants" name="estimated_participants" type="number" inputMode="numeric" min={0} defaultValue={request?.participants ?? ""} />
            </Field>
            <Field label="Pacote" htmlFor="package_id">
              <Select id="package_id" name="package_id" defaultValue="">
                <option value="">Sem pacote</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Observações" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={request?.message ?? ""} />
          </Field>
          <Field label="Salvar como" htmlFor="status">
            <Select id="status" name="status" defaultValue="PRE_RESERVED">
              <option value="PRE_RESERVED">Pré-reserva (bloqueia até expirar)</option>
              <option value="CONFIRMED">Evento confirmado</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-24 md:bottom-4 flex gap-2">
        <Link href="/agenda" className="h-12 px-4 inline-flex items-center rounded-xl border border-border bg-surface text-sm font-medium">Cancelar</Link>
        <SubmitButton size="lg" className="flex-1" pendingText="Salvando...">Salvar</SubmitButton>
      </div>
    </form>
  );
}
