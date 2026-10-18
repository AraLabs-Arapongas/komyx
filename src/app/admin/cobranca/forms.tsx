"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { adminCreateInvoice, adminMarkInvoicePaid, adminMarkRefundDone, adminSetAutoBilling, adminUpdateMonthlyPrice } from "@/lib/actions/admin-billing";
import { PendingButton } from "@/components/ui/pending-button";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";
import { PAYMENT_METHODS } from "@/lib/billing/invoices";
import { startRouteLoading } from "@/components/ui/route-loader";

/** Inline monthly price. Empty = plan's list price (shown as placeholder). */
export function PriceForm({ orgId, value, fallback }: { orgId: string; value: string; fallback: string }) {
  const [state, action] = useActionState(adminUpdateMonthlyPrice, undefined);
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="organization_id" value={orgId} />
      <Input name="monthly_price" aria-label="Mensalidade" inputMode="decimal" defaultValue={value} placeholder={fallback} className="h-8 w-24 rounded-lg px-2 text-sm" />
      <SubmitButton size="sm" variant="outline" className="h-8 px-2 text-xs">Salvar</SubmitButton>
      {state ? <span className={state.ok ? "text-xs text-emerald-700" : "text-xs text-red-600"}>{state.ok ? state.message : state.error}</span> : null}
    </form>
  );
}

export function NewInvoiceForm({ orgId, start, end, due, amount }: { orgId: string; start: string; end: string; due: string; amount: string }) {
  const [state, action] = useActionState(adminCreateInvoice, undefined);
  const ref = useRef<HTMLDetailsElement>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.ok && ref.current) ref.current.open = false; }, [state]);
  const k = (n: string) => `${n}_${orgId}`;
  return (
    <details ref={ref} className="text-left">
      <summary className="cursor-pointer text-brand text-xs font-medium whitespace-nowrap">Gerar fatura</summary>
      <form action={action} className="mt-2 w-72 space-y-2">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        <input type="hidden" name="organization_id" value={orgId} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Início do período" htmlFor={k("ps")} error={fe.period_start}><Input id={k("ps")} name="period_start" type="date" defaultValue={start} required className="h-9 px-2 text-sm" /></Field>
          <Field label="Fim do período" htmlFor={k("pe")} error={fe.period_end}><Input id={k("pe")} name="period_end" type="date" defaultValue={end} required className="h-9 px-2 text-sm" /></Field>
          <Field label="Valor (R$)" htmlFor={k("am")} error={fe.amount}><Input id={k("am")} name="amount" inputMode="decimal" defaultValue={amount} placeholder="0,00" required className="h-9 px-2 text-sm" /></Field>
          <Field label="Vencimento" htmlFor={k("du")} error={fe.due_at}><Input id={k("du")} name="due_at" type="date" defaultValue={due} required className="h-9 px-2 text-sm" /></Field>
        </div>
        <Field label="Observação" htmlFor={k("no")}><Input id={k("no")} name="notes" placeholder="Opcional" className="h-9 px-2 text-sm" /></Field>
        <SubmitButton size="sm" pendingText="Gerando...">Gerar fatura</SubmitButton>
      </form>
    </details>
  );
}

export function MarkPaidForm({ id, today }: { id: string; today: string }) {
  const [state, action] = useActionState(adminMarkInvoicePaid, undefined);
  const k = (n: string) => `${n}_${id}`;
  return (
    <details className="text-left">
      <summary className="cursor-pointer text-brand text-xs font-medium whitespace-nowrap">Marcar paga</summary>
      <form action={action} className="mt-2 w-60 space-y-2">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        <input type="hidden" name="id" value={id} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pago em" htmlFor={k("pa")}><Input id={k("pa")} name="paid_at" type="date" defaultValue={today} required className="h-9 px-2 text-sm" /></Field>
          <Field label="Forma" htmlFor={k("me")}><SelectMenu id={k("me")} name="method" defaultValue="pix" size="sm" options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))} className="[&>button]:h-9" /></Field>
        </div>
        <SubmitButton size="sm" pendingText="Salvando...">Confirmar pagamento</SubmitButton>
      </form>
    </details>
  );
}

const FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "aberta", label: "Em aberto" },
  { value: "vencida", label: "Vencidas" },
  { value: "paga", label: "Pagas" },
  { value: "cancelada", label: "Canceladas" },
];

export function StatusFilter({ value }: { value: string }) {
  const router = useRouter();
  return (
    <SelectMenu aria-label="Filtrar faturas" value={value} size="sm" className="w-36" options={FILTERS}
      onChange={(v) => { startRouteLoading(); router.push(v === "todas" ? "/admin/cobranca#faturas" : `/admin/cobranca?status=${v}#faturas`, { scroll: false }); }} />
  );
}

/** Asaas monthly subscription on/off for one buffet. Turning it off asks first. */
export function AutoBillingForm({ orgId, on, available }: { orgId: string; on: boolean; available: boolean }) {
  const [state, action] = useActionState(adminSetAutoBilling, undefined);
  if (!available) return <span className="text-xs text-muted">—</span>;
  return (
    <form action={action} className="flex flex-col items-start gap-1" onSubmit={(e) => { if (on && !window.confirm("Desligar a cobrança automática? O Asaas cancela as próximas cobranças deste buffet.")) e.preventDefault(); }}>
      <input type="hidden" name="organization_id" value={orgId} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <SubmitButton size="sm" variant={on ? "ghost" : "outline"} className="h-8 px-2 text-xs" pendingText={on ? "Desligando..." : "Ligando..."}>{on ? "Ligada · desligar" : "Ligar"}</SubmitButton>
      {state ? <span className={state.ok ? "text-xs text-emerald-700" : "text-xs text-red-600"}>{state.ok ? state.message : state.error}</span> : null}
    </form>
  );
}

/** "Reembolsar R$ X por Pix": the admin confirms the Pix was sent; the row becomes done (audited). */
export function RefundDoneButton({ id, label }: { id: string; label: string }) {
  return (
    <form action={adminMarkRefundDone} onSubmit={(e) => { if (!window.confirm(`${label}: confirme que o Pix já foi enviado ao buffet.`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <PendingButton className="text-xs font-medium text-brand hover:underline whitespace-nowrap">{label}</PendingButton>
    </form>
  );
}
