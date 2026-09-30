"use client";

import { useActionState, useState } from "react";
import { Link2, Copy, Check, MessageCircle, Trash2 } from "lucide-react";
import { addGuest, removeGuest, ensureGuestLink, revokePublicLink } from "@/lib/actions/guests-payments";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { whatsappLink } from "@/lib/utils";

type Guest = { id: string; name: string; participants: number; source: "MANUAL" | "PUBLIC"; notes: string | null };

export function GuestSection({ eventId, guests, guestLink, eventTitle, customerPhone }: { eventId: string; guests: Guest[]; guestLink: { id: string; url: string } | null; eventTitle: string; customerPhone: string }) {
  const [state, action] = useActionState(addGuest, undefined);
  const [copied, setCopied] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  async function copy() {
    if (!guestLink) return;
    try { await navigator.clipboard.writeText(guestLink.url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-stone-50 p-3 space-y-2">
        <p className="text-sm font-medium inline-flex items-center gap-1.5"><Link2 className="h-4 w-4" /> Link público de confirmação</p>
        {guestLink ? (
          <>
            <p className="text-xs text-muted break-all">{guestLink.url}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className={buttonClass("outline", "sm")}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar"}</button>
              <a href={whatsappLink(customerPhone, `Confirme presença na ${eventTitle}: ${guestLink.url}`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              <form action={revokePublicLink}>
                <input type="hidden" name="id" value={guestLink.id} />
                <input type="hidden" name="event_id" value={eventId} />
                <button className="h-9 px-3 text-sm text-muted hover:text-red-600">Revogar</button>
              </form>
            </div>
          </>
        ) : (
          <form action={ensureGuestLink}>
            <input type="hidden" name="event_id" value={eventId} />
            <p className="text-xs text-muted mb-2">Gere um link seguro para os convidados informarem nome e quantidade.</p>
            <button className={buttonClass("secondary", "sm")}>Gerar link</button>
          </form>
        )}
      </div>

      {guests.length > 0 ? (
        <ul className="divide-y divide-border">
          {guests.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{g.name} <span className="text-muted font-normal text-sm">· {g.participants} {g.participants === 1 ? "pessoa" : "pessoas"}</span></p>
                <p className="text-xs text-muted">{g.source === "PUBLIC" ? "Pelo link" : "Manual"}{g.notes ? ` · ${g.notes}` : ""}</p>
              </div>
              <form action={removeGuest}>
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="event_id" value={eventId} />
                <button className="h-9 w-9 grid place-items-center text-muted hover:text-red-600" aria-label="Remover convidado"><Trash2 className="h-4 w-4" /></button>
              </form>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">Nenhum convidado ainda.</p>}

      <form action={action} className="space-y-3 border-t border-border pt-4">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        <input type="hidden" name="event_id" value={eventId} />
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <Field label="Adicionar convidado" htmlFor="guest_name" error={fe.name}>
            <Input id="guest_name" name="name" placeholder="Nome" required />
          </Field>
          <Field label="Pessoas" htmlFor="guest_participants" error={fe.participants}>
            <Input id="guest_participants" name="participants" type="number" inputMode="numeric" min={1} defaultValue={1} className="w-20" required />
          </Field>
        </div>
        <SubmitButton size="sm" variant="secondary">Adicionar</SubmitButton>
      </form>
    </div>
  );
}
