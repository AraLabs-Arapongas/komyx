"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateEvent } from "@/lib/actions/events";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { ParticipantsFields } from "@/components/events/participants-fields";
import type { PackagePricing } from "@/lib/pricing";

type Props = {
  event: { id: string; title: string; date: string; start: string; end: string; adults: number | null; children: number | null; package_id: string; space: string; notes: string; celebrant_name: string; celebrant_age: number | null };
  packages: PackagePricing[];
};

export function EditEventForm({ event, packages }: Props) {
  const [state, action] = useActionState(updateEvent, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="id" value={event.id} />
      <Card>
        <CardBody className="pt-4 space-y-4">
          <Field label="Nome do evento" htmlFor="title"><Input id="title" name="title" defaultValue={event.title} /></Field>
          <Field label="Data" htmlFor="date" error={fe.date}><Input id="date" name="date" type="date" defaultValue={event.date} required /></Field>
          {state && !state.ok && state.fieldErrors?.same_day ? (
            <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
              <input type="checkbox" name="force_same_day" className="mt-0.5 h-4 w-4" />
              <span><b>Já tem evento neste dia</b> ({state.fieldErrors.same_day}). Sei disso e quero mover mesmo assim.</span>
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início" htmlFor="start_time" error={fe.start_time}><Input id="start_time" name="start_time" type="time" defaultValue={event.start} step={900} required /></Field>
            <Field label="Fim" htmlFor="end_time" error={fe.end_time}><Input id="end_time" name="end_time" type="time" defaultValue={event.end} step={900} required /></Field>
          </div>
          <ParticipantsFields packages={packages} initialPackageId={event.package_id} initialAdults={event.adults} initialChildren={event.children} errors={fe} />
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <Field label="Aniversariante" htmlFor="celebrant_name"><Input id="celebrant_name" name="celebrant_name" defaultValue={event.celebrant_name} /></Field>
            <Field label="Idade" htmlFor="celebrant_age"><Input id="celebrant_age" name="celebrant_age" type="number" min={0} max={150} defaultValue={event.celebrant_age ?? ""} /></Field>
          </div>
          <Field label="Espaço / salão" htmlFor="space" hint="Deixe vazio se o buffet tem um único espaço. Eventos só conflitam dentro do mesmo espaço.">
            <Input id="space" name="space" defaultValue={event.space} placeholder="Ex.: Salão principal" />
          </Field>
          <Field label="Observações" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={event.notes} /></Field>
        </CardBody>
      </Card>
      <div className="flex gap-2">
        <Link href={`/eventos/${event.id}`} className="h-12 px-4 inline-flex items-center rounded-xl border border-border bg-surface text-sm font-medium">Cancelar</Link>
        <SubmitButton size="lg" className="flex-1" pendingText="Salvando...">Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}
