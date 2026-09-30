"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Copy, Check, MessageCircle, Link2 } from "lucide-react";
import { addQuoteItem, updateQuoteDiscount, changeQuoteStatus, updateQuoteParticipants, updateQuoteInstallments } from "@/lib/actions/quotes";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { extrasFor, type PackagePricing } from "@/lib/pricing";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import type { DiscountType, QuoteStatus } from "@/lib/labels";

export function QuoteItemForm({ quoteId, eventId }: { quoteId: string; eventId: string }) {
  const [state, action] = useActionState(addQuoteItem, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="kind" value="CUSTOM" />
      <Field label="Descrição" htmlFor="item_description" error={fe.description}><Input id="item_description" name="description" placeholder="Ex.: Decoração temática" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantidade" htmlFor="item_qty" error={fe.quantity}><Input id="item_qty" name="quantity" inputMode="decimal" defaultValue={1} required /></Field>
        <Field label="Valor unitário (R$)" htmlFor="item_price" error={fe.unit_price}><Input id="item_price" name="unit_price" inputMode="decimal" placeholder="0,00" required /></Field>
      </div>
      <SubmitButton size="sm" variant="secondary">Adicionar item</SubmitButton>
    </form>
  );
}

export function DiscountForm({ quoteId, eventId, discountType, discountValue, notes }: { quoteId: string; eventId: string; discountType: DiscountType; discountValue: number; notes: string }) {
  const [state, action] = useActionState(updateQuoteDiscount, undefined);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="event_id" value={eventId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" htmlFor="discount_type">
          <Select id="discount_type" name="discount_type" defaultValue={discountType}>
            <option value="AMOUNT">Valor (R$)</option>
            <option value="PERCENT">Percentual (%)</option>
          </Select>
        </Field>
        <Field label="Desconto" htmlFor="discount_value"><Input id="discount_value" name="discount_value" inputMode="decimal" defaultValue={discountValue} /></Field>
      </div>
      <Field label="Observações do orçamento" htmlFor="quote_notes"><Textarea id="quote_notes" name="notes" defaultValue={notes} className="min-h-20" placeholder="Condições, o que está incluso, validade..." /></Field>
      <SubmitButton size="sm" variant="secondary">Salvar</SubmitButton>
    </form>
  );
}

export function QuoteStatusForm({ quoteId, eventId, status }: { quoteId: string; eventId: string; status: QuoteStatus }) {
  const [state, action] = useActionState(changeQuoteStatus, undefined);
  const btn = (to: QuoteStatus, label: string, variant: "primary" | "outline" | "ghost" = "outline", cls?: string) => (
    <form action={action}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="status" value={to} />
      <SubmitButton size="sm" variant={variant} className={cls}>{label}</SubmitButton>
    </form>
  );
  return (
    <div className="space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? btn("SENT", "Marcar como enviado", "primary") : null}
        {status === "SENT" ? (<>{btn("ACCEPTED", "Cliente aceitou", "primary")}{btn("REJECTED", "Recusado", "ghost", "text-red-600")}{btn("DRAFT", "Voltar a rascunho")}</>) : null}
        {status === "ACCEPTED" || status === "REJECTED" ? btn("SENT", "Reabrir") : null}
      </div>
    </div>
  );
}

export function ShareQuote({ publicUrl, whatsappUrl }: { publicUrl: string | null; whatsappUrl: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  return (
    <div className="space-y-2">
      {publicUrl ? <p className="text-xs text-muted inline-flex items-center gap-1 break-all"><Link2 className="h-3.5 w-3.5 shrink-0" /> {publicUrl}</p> : <p className="text-xs text-muted">Marque como enviado para gerar o link público.</p>}
      <div className="flex flex-wrap gap-2">
        <a href={whatsappUrl} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Enviar por WhatsApp</a>
        {publicUrl ? <button type="button" onClick={copy} className={buttonClass("outline", "sm")}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copiado" : "Copiar link"}</button> : null}
      </div>
    </div>
  );
}

export function ParticipantsForm({ quoteId, eventId, adults, childrenCount, pkg }: { quoteId: string; eventId: string; adults: number; childrenCount: number; pkg: PackagePricing | null }) {
  const [state, action] = useActionState(updateQuoteParticipants, undefined);
  const [a, setA] = useState(adults);
  const [c, setC] = useState(childrenCount);
  const { extraAdults, extraChildren } = extrasFor(pkg, a, c);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="event_id" value={eventId} />
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <Field label="Adultos" htmlFor="q_adults"><Input id="q_adults" name="adults" type="number" min={0} value={a} onChange={(e) => setA(Number(e.target.value || 0))} /></Field>
        <Field label="Crianças" htmlFor="q_children"><Input id="q_children" name="children" type="number" min={0} value={c} onChange={(e) => setC(Number(e.target.value || 0))} /></Field>
        <SubmitButton size="md" variant="secondary">Recalcular</SubmitButton>
      </div>
      {pkg && (extraAdults > 0 || extraChildren > 0) ? (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Extras: {extraAdults} adulto(s) × {formatCurrency(pkg.extra_adult_price)} · {extraChildren} criança(s) × {formatCurrency(pkg.extra_child_price)}. Ao recalcular, as linhas de pacote e extras são refeitas; adicionais e itens livres ficam.</p>
      ) : null}
    </form>
  );
}

type Inst = { label: string; percent: number; rule: "ON_ACCEPT" | "DAYS_BEFORE_EVENT" | "FIXED_DATE"; days_before: number | null; due_date: string | null };

export function InstallmentsForm({ quoteId, eventId, installments }: { quoteId: string; eventId: string; installments: Inst[] }) {
  const [state, action] = useActionState(updateQuoteInstallments, undefined);
  const [rows, setRows] = useState<Inst[]>(installments);
  const [open, setOpen] = useState(false);
  const sum = rows.reduce((a, r) => a + (Number(r.percent) || 0), 0);
  const update = (i: number, patch: Partial<Inst>) => setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-sm text-brand font-medium">Editar plano deste orçamento</button>;
  return (
    <form action={action} className="space-y-3 border-t border-border pt-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="event_id" value={eventId} />
      {rows.map((r, i) => (
        <div key={i} className="rounded-xl border border-border p-2 space-y-2">
          <div className="grid grid-cols-[1fr_70px_auto] gap-2 items-end">
            <Field label="Parcela" htmlFor={`inst_label_${i}`}><Input id={`inst_label_${i}`} name="label" value={r.label} onChange={(e) => update(i, { label: e.target.value })} /></Field>
            <Field label="%" htmlFor={`inst_pct_${i}`}><Input id={`inst_pct_${i}`} name="percent" inputMode="decimal" value={r.percent} onChange={(e) => update(i, { percent: Number(e.target.value) })} /></Field>
            <button type="button" onClick={() => setRows((x) => x.filter((_, idx) => idx !== i))} className="h-11 w-11 grid place-items-center text-muted hover:text-red-600" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <Select name="rule" value={r.rule} onChange={(e) => update(i, { rule: e.target.value as Inst["rule"] })}>
              <option value="ON_ACCEPT">No aceite</option>
              <option value="DAYS_BEFORE_EVENT">X dias antes da festa</option>
              <option value="FIXED_DATE">Data fixa</option>
            </Select>
            {r.rule === "FIXED_DATE" ? (
              <><input type="hidden" name="days_before" value="" /><Input name="due_date" type="date" value={r.due_date ?? ""} onChange={(e) => update(i, { due_date: e.target.value })} /></>
            ) : (
              <><Input name="days_before" type="number" min={0} placeholder="dias" value={r.rule === "DAYS_BEFORE_EVENT" ? r.days_before ?? 0 : ""} disabled={r.rule !== "DAYS_BEFORE_EVENT"} onChange={(e) => update(i, { days_before: Number(e.target.value) })} /><input type="hidden" name="due_date" value="" /></>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setRows((x) => [...x, { label: `Parcela ${x.length + 1}`, percent: 0, rule: "DAYS_BEFORE_EVENT", days_before: 30, due_date: null }])} className="text-sm text-brand font-medium">+ Parcela</button>
        <span className={Math.abs(sum - 100) < 0.01 ? "text-sm text-emerald-700" : "text-sm text-red-600"}>Soma: {sum}%</span>
      </div>
      <div className="flex gap-2">
        <SubmitButton size="sm">Salvar plano</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="h-9 px-3 text-sm text-muted">Fechar</button>
      </div>
    </form>
  );
}
