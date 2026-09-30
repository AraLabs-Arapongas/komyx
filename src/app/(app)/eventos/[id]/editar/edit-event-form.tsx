"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateEvent } from "@/lib/actions/events";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

type Props = {
  event: { id: string; title: string; date: string; start: string; end: string; estimated_participants: number | null; package_id: string; space: string; notes: string };
  packages: { id: string; name: string }[];
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início" htmlFor="start_time" error={fe.start_time}><Input id="start_time" name="start_time" type="time" defaultValue={event.start} step={900} required /></Field>
            <Field label="Fim" htmlFor="end_time" error={fe.end_time}><Input id="end_time" name="end_time" type="time" defaultValue={event.end} step={900} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Participantes" htmlFor="estimated_participants" error={fe.estimated_participants}>
              <Input id="estimated_participants" name="estimated_participants" type="number" inputMode="numeric" min={0} defaultValue={event.estimated_participants ?? ""} />
            </Field>
            <Field label="Pacote" htmlFor="package_id">
              <Select id="package_id" name="package_id" defaultValue={event.package_id}>
                <option value="">Sem pacote</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
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
