"use client";

import { useActionState, useEffect, useRef } from "react";
import { Link2, MessageCircle, Trash2, Check } from "lucide-react";
import { addGuest, removeGuest, revokePublicLink, checkInGuest } from "@/lib/actions/guests-payments";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { whatsappLink } from "@/lib/utils";

type Guest = { id: string; name: string; adults: number; children: number; participants: number | null; source: "MANUAL" | "PUBLIC" | "DOOR" | "CLIENT"; notes: string | null; checked_in_at: string | null; checked_in_adults: number; checked_in_children: number };

const SOURCE_LABEL = { MANUAL: "Manual", PUBLIC: "Pelo link", CLIENT: "Pelo cliente", DOOR: "Na portaria" };

export function GuestSection({ eventId, guests, guestLink, eventTitle, customerPhone }: { eventId: string; guests: Guest[]; guestLink: { id: string; url: string } | null; eventTitle: string; customerPhone: string }) {
  const [state, action] = useActionState(addGuest, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-stone-50 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-medium inline-flex items-center gap-1.5 shrink-0"><Link2 className="h-4 w-4" /> Confirmação de presença (RSVP)</p>
          {guestLink ? (
            <>
              <p className="text-xs text-muted truncate min-w-0 flex-1 basis-40">{guestLink.url}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <CopyButton text={guestLink.url} />
                <a href={whatsappLink(customerPhone, `Confirme presença na ${eventTitle}: ${guestLink.url}`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Enviar</a>
                <form action={revokePublicLink}>
                  <input type="hidden" name="id" value={guestLink.id} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <button className="h-9 px-2 text-xs text-muted hover:text-red-600">Revogar</button>
                </form>
              </div>
            </>
          ) : <span className="text-xs text-muted ml-auto">Link revogado</span>}
        </div>
      </div>

      {guests.length > 0 ? (
        <ul className="divide-y divide-border">
          {guests.map((g) => {
            const arrived = Boolean(g.checked_in_at);
            return (
              <li key={g.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{arrived ? <Check className="inline h-4 w-4 text-emerald-600 mr-1" /> : null}{g.name} <span className="text-muted font-normal text-sm">· {g.adults}A {g.children}C</span></p>
                  <p className="text-xs text-muted">{SOURCE_LABEL[g.source]}{arrived ? ` · presentes ${g.checked_in_adults + g.checked_in_children}` : ""}{g.notes ? ` · ${g.notes}` : ""}</p>
                </div>
                <div className="flex items-center gap-1">
                  <form action={checkInGuest}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="event_id" value={eventId} />
                    <input type="hidden" name="checked_in_adults" value={arrived ? 0 : g.adults} />
                    <input type="hidden" name="checked_in_children" value={arrived ? 0 : g.children} />
                    <button className={buttonClass(arrived ? "ghost" : "outline", "sm")}>{arrived ? "Desfazer" : "Chegou"}</button>
                  </form>
                  <form action={removeGuest}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="event_id" value={eventId} />
                    <button className="h-9 w-9 grid place-items-center text-muted hover:text-red-600" aria-label="Remover convidado"><Trash2 className="h-4 w-4" /></button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted">Nenhum convidado ainda.</p>}

      <form ref={ref} action={action} className="space-y-2 border-t border-border pt-3">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        <input type="hidden" name="event_id" value={eventId} />
        <div className="grid grid-cols-[1fr_72px_72px_auto] gap-2 items-end">
          <Field label="Adicionar convidado" htmlFor="guest_name" error={fe.name}>
            <Input id="guest_name" name="name" placeholder="Nome" required />
          </Field>
          <Field label="Adultos" htmlFor="guest_adults" error={fe.adults}>
            <Input id="guest_adults" name="adults" type="number" inputMode="numeric" min={0} defaultValue={1} required />
          </Field>
          <Field label="Crianças" htmlFor="guest_children">
            <Input id="guest_children" name="children" type="number" inputMode="numeric" min={0} defaultValue={0} required />
          </Field>
          <SubmitButton size="md" variant="secondary">Adicionar</SubmitButton>
        </div>
      </form>
    </div>
  );
}
