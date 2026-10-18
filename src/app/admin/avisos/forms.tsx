"use client";

import { useActionState, useState } from "react";
import { emailAnnouncement, saveAnnouncement } from "@/lib/actions/admin-messages";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";
import { toDateKey, toTimeKey } from "@/lib/utils";

export type AnnouncementValues = { id?: string; title: string; body: string; tone: string; audience: string; link_url: string | null; link_label: string | null; starts_at: string; ends_at: string | null; emailed_at?: string | null };
type Counts = { all: number; basic: number; premium: number };

// datetime-local value in the app timezone.
const local = (iso: string) => `${toDateKey(iso)}T${toTimeKey(iso)}`;
const owners = (n: number) => `${n} dono${n === 1 ? "" : "s"}`;

export function AnnouncementForm({ initial, counts }: { initial?: AnnouncementValues; counts: Counts }) {
  const [state, action] = useActionState(saveAnnouncement, undefined);
  const [audience, setAudience] = useState(initial?.audience ?? "all");
  const [email, setEmail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const count = counts[audience as keyof Counts] ?? 0;
  const canEmail = !initial?.emailed_at;
  return (
    <form action={(fd) => { setConfirming(false); setEmail(false); return action(fd); }} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Field label="Título" htmlFor="ann_title" error={fe.title}><Input id="ann_title" name="title" defaultValue={initial?.title} maxLength={120} required /></Field>
      <Field label="Texto" htmlFor="ann_body" error={fe.body}><Textarea id="ann_body" name="body" defaultValue={initial?.body} maxLength={1000} className="min-h-20" /></Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Tom" htmlFor="ann_tone"><SelectMenu id="ann_tone" aria-label="Tom" name="tone" defaultValue={initial?.tone ?? "info"} options={[{ value: "info", label: "Informação" }, { value: "success", label: "Novidade" }, { value: "warning", label: "Atenção" }]} /></Field>
        <Field label="Público" htmlFor="ann_audience"><SelectMenu id="ann_audience" aria-label="Público" name="audience" value={audience} onChange={setAudience} options={[{ value: "all", label: "Todos os buffets" }, { value: "basic", label: "Plano básico" }, { value: "premium", label: "Plano premium" }]} /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Link (opcional)" htmlFor="ann_link" hint="Um caminho do app (/conta) ou https://…" error={fe.link_url}><Input id="ann_link" name="link_url" defaultValue={initial?.link_url ?? ""} placeholder="/conta" /></Field>
        <Field label="Texto do link" htmlFor="ann_link_label" error={fe.link_label}><Input id="ann_link_label" name="link_label" defaultValue={initial?.link_label ?? ""} maxLength={40} placeholder="Saiba mais" /></Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Começa em" htmlFor="ann_starts" error={fe.starts_at}><Input id="ann_starts" name="starts_at" type="datetime-local" defaultValue={local(initial?.starts_at ?? new Date().toISOString())} required suppressHydrationWarning /></Field>
        <Field label="Termina em (opcional)" htmlFor="ann_ends" error={fe.ends_at}><Input id="ann_ends" name="ends_at" type="datetime-local" defaultValue={initial?.ends_at ? local(initial.ends_at) : ""} /></Field>
      </div>
      {canEmail ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="send_email" checked={email} onChange={(e) => { setEmail(e.target.checked); setConfirming(false); }} className="h-4 w-4 accent-[var(--color-brand)]" />
          Enviar também por e-mail para os donos ({owners(count)})
        </label>
      ) : <p className="text-xs text-muted">E-mail já enviado para este aviso.</p>}
      {email && confirming ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 space-y-2">
          <p>O e-mail vai para <strong>{owners(count)}</strong> agora e não pode ser desfeito.</p>
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingText="Enviando…">Confirmar e enviar para {owners(count)}</SubmitButton>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Voltar</Button>
          </div>
        </div>
      ) : email ? (
        <Button size="sm" onClick={() => setConfirming(true)} disabled={!count}>{initial?.id ? "Salvar e enviar e-mail" : "Publicar e enviar e-mail"}</Button>
      ) : (
        <SubmitButton size="sm" pendingText="Salvando…">{initial?.id ? "Salvar" : "Publicar aviso"}</SubmitButton>
      )}
    </form>
  );
}

/** E-mail an existing announcement, behind a confirmation with the number of owners. */
export function EmailAnnouncementButton({ id, count }: { id: string; count: number }) {
  const [state, action] = useActionState(emailAnnouncement, undefined);
  const [confirming, setConfirming] = useState(false);
  if (state?.ok) return <span className="text-xs text-emerald-700">{state.message}</span>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {state && !state.ok ? <span className="text-xs text-red-700">{state.error}</span> : null}
      {confirming ? (
        <>
          <span className="text-xs text-amber-900">Enviar para {owners(count)}?</span>
          <SubmitButton size="sm" pendingText="Enviando…">Confirmar envio</SubmitButton>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Não</Button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} disabled={!count} className="text-brand font-medium disabled:opacity-50">Enviar por e-mail</button>
      )}
    </form>
  );
}
