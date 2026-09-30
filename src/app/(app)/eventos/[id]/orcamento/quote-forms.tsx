"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Copy, Check, MessageCircle, Link2 } from "lucide-react";
import { addQuoteItem, updateQuoteDiscount, changeQuoteStatus } from "@/lib/actions/quotes";
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
