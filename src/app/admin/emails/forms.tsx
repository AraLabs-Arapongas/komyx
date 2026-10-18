"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { resendMessage, saveEmailTemplate } from "@/lib/actions/admin-messages";
import { renderCopy, SAMPLE_VARS, type TemplateCopy } from "@/lib/email/template-copy";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";

const FIELDS: { name: keyof TemplateCopy; label: string; long?: boolean }[] = [
  { name: "subject", label: "Assunto" },
  { name: "title", label: "Título" },
  { name: "intro", label: "Texto", long: true },
  { name: "button", label: "Botão" },
  { name: "outro", label: "Rodapé", long: true },
];

export function TemplateEditor({ template }: { template: TemplateCopy & { key: string } }) {
  const [state, action] = useActionState(saveEmailTemplate, undefined);
  const [copy, setCopy] = useState<TemplateCopy>(template);
  const preview = useMemo(() => renderCopy(copy, SAMPLE_VARS), [copy]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <form action={action} className="space-y-3">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        <input type="hidden" name="key" value={template.key} />
        {FIELDS.map((f) => (
          <Field key={f.name} label={f.label} htmlFor={`tpl_${f.name}`} error={fe[f.name]}>
            {f.long
              ? <Textarea id={`tpl_${f.name}`} name={f.name} value={copy[f.name]} onChange={(e) => setCopy({ ...copy, [f.name]: e.target.value })} className="min-h-20" required />
              : <Input id={`tpl_${f.name}`} name={f.name} value={copy[f.name]} onChange={(e) => setCopy({ ...copy, [f.name]: e.target.value })} required />}
          </Field>
        ))}
        <div className="rounded-xl bg-stone-50 border border-border px-3 py-2 text-xs text-muted space-y-0.5">
          <p className="font-medium text-foreground">Variáveis</p>
          <p><code>{"{{buffet}}"}</code> nome do buffet · <code>{"{{quem}}"}</code> quem fez o pedido (ou o título do aviso) · <code>{"{{detalhes}}"}</code> detalhes (ou o texto do aviso) · <code>{"{{link}}"}</code> endereço do botão.</p>
          <p>Quando uma variável vem vazia, o &quot; · &quot; ao lado dela some.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SubmitButton size="sm" name="intent" value="save" pendingText="Salvando…">Salvar</SubmitButton>
          <SubmitButton size="sm" variant="outline" name="intent" value="test" pendingText="Enviando…">Enviar teste para mim</SubmitButton>
        </div>
      </form>
      <div className="space-y-2">
        <p className="text-xs text-muted">Prévia com dados de exemplo · <span className="font-medium text-foreground">{preview.subject}</span></p>
        <iframe title="Prévia do e-mail" srcDoc={preview.html} sandbox="" className="w-full h-[560px] rounded-xl border border-border bg-[#f7f5f0]" />
      </div>
    </div>
  );
}

export function LogFilters({ channel, status }: { channel: string; status: string }) {
  const router = useRouter();
  const go = (next: { channel?: string; status?: string }) => {
    const p = new URLSearchParams({ tab: "envios" });
    const c = next.channel ?? channel;
    const s = next.status ?? status;
    if (c) p.set("channel", c);
    if (s) p.set("status", s);
    router.push(`/admin/emails?${p}`);
  };
  return (
    <div className="flex gap-2">
      <SelectMenu aria-label="Canal" size="sm" className="w-28" value={channel} onChange={(v) => go({ channel: v })}
        options={[{ value: "", label: "Todos canais" }, { value: "email", label: "E-mail" }, { value: "sms", label: "SMS" }]} />
      <SelectMenu aria-label="Status" size="sm" className="w-28" value={status} onChange={(v) => go({ status: v })}
        options={[{ value: "", label: "Todos status" }, { value: "sent", label: "Enviados" }, { value: "failed", label: "Com falha" }, { value: "skipped", label: "Ignorados" }]} />
    </div>
  );
}

export function ResendButton({ id }: { id: string }) {
  const [state, action] = useActionState(resendMessage, undefined);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {state ? <span className={state.ok ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{state.ok ? state.message : state.error}</span> : null}
      {state?.ok ? null : <SubmitButton size="sm" variant="outline" pendingText="Reenviando…">Reenviar</SubmitButton>}
    </form>
  );
}
