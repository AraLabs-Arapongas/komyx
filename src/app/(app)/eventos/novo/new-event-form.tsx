"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createEvent } from "@/lib/actions/events";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency, formatPhone } from "@/lib/utils";
import { CustomerField } from "@/components/events/customer-field";
import { ParticipantsFields } from "@/components/events/participants-fields";
import { LEAD_SOURCES, type PackagePricing } from "@/lib/pricing";

type Props = {
  packages: PackagePricing[];
  customer: { id: string; name: string; whatsapp: string } | null;
  request: {
    id: string; name: string; whatsapp: string; adults: number | null; children: number | null; message: string | null; source: string | null;
    celebrant_name: string | null; celebrant_birth_date: string | null; package_id: string | null; estimated_total: number | string | null;
  } | null;
  defaults: { date: string; start: string; durationMinutes: number; validityHours: number };
  sameDayWarning?: string | null;
  isOwner: boolean;
};

function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function NewEventForm({ packages, customer, request, defaults, sameDayWarning, isOwner }: Props) {
  const [state, action] = useActionState(createEvent, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(addMinutesToTime(defaults.start, defaults.durationMinutes));
  const [selectedCustomer, setSelectedCustomer] = useState(customer);
  const endMin = useMemo(() => addMinutesToTime(start, 30), [start]);
  const sameDay = sameDayWarning ?? (state && !state.ok ? state.fieldErrors?.same_day : undefined);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {request ? <input type="hidden" name="request_id" value={request.id} /> : null}
      {request?.estimated_total != null ? (
        <Alert tone="info">Solicitação vinda de <b>{LEAD_SOURCES.find((s) => s.value === request.source)?.label ?? request.source ?? "origem não informada"}</b> com orçamento estimado de {formatCurrency(request.estimated_total)}. O orçamento será criado automaticamente ao salvar.</Alert>
      ) : null}

      <Card>
        <CardBody className="pt-4 space-y-4">
          <h2 className="font-semibold">Cliente</h2>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-border px-3 py-2.5">
              <div>
                <p className="font-medium">{selectedCustomer.name}</p>
                <p className="text-sm text-muted">{formatPhone(selectedCustomer.whatsapp)} · cliente já cadastrado</p>
              </div>
              <input type="hidden" name="customer_id" value={selectedCustomer.id} />
              <button type="button" className="text-sm text-brand font-medium" onClick={() => setSelectedCustomer(null)}>Trocar</button>
            </div>
          ) : (
            <>
              <CustomerField initialName={request?.name ?? ""} error={fe.customer_name} onPick={(c) => setSelectedCustomer(c)} />
              <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp} hint="DDD + número. Cliente novo é cadastrado automaticamente ao salvar.">
                <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={request?.whatsapp ?? ""} placeholder="(11) 99999-9999" required />
              </Field>
              <Field label="Como conheceu o buffet?" htmlFor="source">
                <Select id="source" name="source" defaultValue={request?.source ?? ""}>
                  <option value="">Não informado</option>
                  {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
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
          {sameDay && isOwner ? (
            <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
              <input type="checkbox" name="force_same_day" className="mt-0.5 h-4 w-4" defaultChecked={Boolean(sameDayWarning)} />
              <span><b>Já tem evento neste dia</b> ({sameDay}). Sei disso e quero marcar outro mesmo assim.</span>
            </label>
          ) : null}
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
          <h2 className="font-semibold">Pacote e participantes</h2>
          <ParticipantsFields packages={packages} initialPackageId={request?.package_id ?? ""} initialAdults={request?.adults ?? null} initialChildren={request?.children ?? null} errors={fe} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4 space-y-4">
          <h2 className="font-semibold">Detalhes <span className="text-muted font-normal text-sm">(opcional)</span></h2>
          <Field label="Nome do evento" htmlFor="title">
            <Input id="title" name="title" placeholder="Ex.: Aniversário da Júlia" />
          </Field>
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field label="Aniversariante" htmlFor="celebrant_name">
              <Input id="celebrant_name" name="celebrant_name" defaultValue={request?.celebrant_name ?? ""} placeholder="Nome" />
            </Field>
            <Field label="Idade" htmlFor="celebrant_age" error={fe.celebrant_age}>
              <Input id="celebrant_age" name="celebrant_age" type="number" inputMode="numeric" min={0} max={150} />
            </Field>
          </div>
          <Field label="Data de nascimento do aniversariante" htmlFor="celebrant_birth_date" hint="Salva na lista de aniversariantes para lembrar no próximo ano.">
            <Input id="celebrant_birth_date" name="celebrant_birth_date" type="date" defaultValue={request?.celebrant_birth_date ?? ""} />
          </Field>
          <Field label="Observações" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={request?.message ?? ""} />
          </Field>
          <Field label="Reservar a data?" htmlFor="status" hint="Orçamento sempre é criado. Reservar bloqueia a agenda; sem reserva, outro cliente pode fechar o dia.">
            <Select id="status" name="status" defaultValue="PRE_RESERVED">
              <option value="PRE_RESERVED">Sim, segurar a data por {defaults.validityHours}h (pré-reserva)</option>
              <option value="QUOTE">Não, só o orçamento (não bloqueia a agenda)</option>
              <option value="CONFIRMED">Já está fechado: confirmar evento</option>
            </Select>
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-20 md:bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border flex gap-2">
        <Link href="/agenda" className="h-12 px-4 inline-flex items-center rounded-xl border border-border bg-surface text-sm font-medium">Cancelar</Link>
        <SubmitButton size="lg" className="flex-1" pendingText="Salvando...">Criar orçamento</SubmitButton>
      </div>
    </form>
  );
}
