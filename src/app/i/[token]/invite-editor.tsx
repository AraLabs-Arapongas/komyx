"use client";

import { useActionState, useState } from "react";
import { updateInviteByToken } from "@/lib/actions/public";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { CopyButton } from "@/components/ui/copy-button";

export function InviteEditor({ token, imageUrl, title, message, guestUrl }: { token: string; imageUrl: string | null; title: string; message: string; guestUrl: string | null }) {
  const [state, action] = useActionState(updateInviteByToken, undefined);
  const [preview, setPreview] = useState<string | null>(imageUrl);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <p className="font-medium">Imagem do convite</p>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Convite" className="w-full rounded-xl border border-border" />
        ) : <div className="aspect-[3/4] rounded-xl border border-dashed border-border grid place-items-center text-sm text-muted">Envie a arte do convite (JPG, PNG ou WebP)</div>}
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-brand file:font-medium"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <Field label="Título" htmlFor="invite_title"><Input id="invite_title" name="invite_title" defaultValue={title} placeholder="Ex.: Aniversário do Samuel · 4 anos" /></Field>
        <Field label="Mensagem para os convidados" htmlFor="invite_message"><Textarea id="invite_message" name="invite_message" defaultValue={message} placeholder="Ex.: Será uma aventura incrível! Confirme sua presença até dia 20." /></Field>
      </div>
      <SubmitButton size="lg" className="w-full" pendingText="Salvando...">Salvar convite</SubmitButton>
      {guestUrl ? (
        <div className="rounded-2xl border border-border bg-stone-50 p-4 space-y-2 text-sm">
          <p className="font-medium">Link para enviar aos convidados</p>
          <p className="text-xs text-muted break-all">{guestUrl}</p>
          <div className="flex gap-2">
            <CopyButton text={guestUrl} label="Copiar link" />
            <a href={`https://wa.me/?text=${encodeURIComponent(`Você está convidado! Confirme presença: ${guestUrl}`)}`} target="_blank" rel="noopener" className="h-9 px-3 inline-flex items-center rounded-lg bg-brand-soft text-brand text-sm font-medium">Compartilhar no WhatsApp</a>
          </div>
        </div>
      ) : null}
    </form>
  );
}
