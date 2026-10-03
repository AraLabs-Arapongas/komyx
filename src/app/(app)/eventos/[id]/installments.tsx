import { Check } from "lucide-react";
import { confirmInstallment } from "@/lib/actions/guests-payments";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { allocateInstallments, dueShort, INSTALLMENT_STATUS_LABEL, INSTALLMENT_STATUS_TONE, type InstallmentLike, type InstallmentStatus } from "@/lib/installments";
import { PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { toDateKey } from "@/lib/utils";
import { ReversePaymentButton } from "@/components/events/reverse-payment";

/** Installment plan of the latest quote with paid/pending status and a one-click "Recebida" per open installment. */
export function Installments({ eventId, payments = [], eventConfirmed = false, installments, paidTotal, extrasTotal = 0, eventStartsAt, acceptedAt }: { eventId: string; payments?: { id: string; amount: number; notes: string | null }[]; eventConfirmed?: boolean; installments: InstallmentLike[]; paidTotal: number; extrasTotal?: number; eventStartsAt: string; acceptedAt?: string | null }) {
  if (installments.length === 0 && extrasTotal <= 0) return null;
  const base = allocateInstallments(installments, paidTotal, eventStartsAt, acceptedAt);
  // Whatever was paid beyond the quote installments goes to the on-site extras.
  const planTotal = base.reduce((a, i) => a + i.amountNum, 0);
  const extrasPaid = Math.min(extrasTotal, Math.max(0, paidTotal - planTotal));
  const extrasRemaining = Math.max(0, Math.round((extrasTotal - extrasPaid) * 100) / 100);
  const extrasStatus: InstallmentStatus = extrasRemaining <= 0.005 ? "PAID" : extrasPaid > 0 ? "PARTIAL" : "PENDING";
  const rows: (typeof base[number] & { isExtras?: boolean })[] = extrasTotal > 0
    ? [...base, { label: "Pedidos extras na festa", amount: extrasTotal, rule: "DAYS_BEFORE_EVENT", days_before: 0, due_date: null, amountNum: extrasTotal, paid: extrasPaid, remaining: extrasRemaining, due: null, status: extrasStatus, isExtras: true }]
    : base;
  return (
    <ul className="divide-y divide-border">
      {rows.map((i, idx) => (
        <li key={idx} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-1.5 text-sm">
          <div className="min-w-0 flex items-center gap-2">
            {i.status === "PAID" ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-border" />}
            <span className="truncate"><span className="font-medium">{idx + 1}. {i.label}</span> <span className="text-muted">· {i.isExtras ? "no dia da festa" : dueShort(i.due)}</span></span>
            <Badge tone={INSTALLMENT_STATUS_TONE[i.status]}>{INSTALLMENT_STATUS_LABEL[i.status]}</Badge>
            {(() => {
              // "Desfazer" when we know which payment settled this instalment (the "Recebida" note).
              if (i.status === "PENDING" || i.isExtras) return null;
              const pay = payments.find((p) => p.notes?.startsWith(`Parcela ${idx + 1} ·`));
              return pay ? <ReversePaymentButton paymentId={pay.id} eventId={eventId} amount={pay.amount} label="Desfazer" lastPaymentOfConfirmed={eventConfirmed && payments.length === 1} /> : null;
            })()}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {i.status === "PARTIAL" ? (
              <span className="text-right leading-tight">
                <span className="font-semibold text-amber-800">Falta <Money value={i.remaining} /></span>
                <span className="block text-xs text-muted">pago <Money value={i.paid} /> de <Money value={i.amountNum} /></span>
                <span className="mt-1 block h-1 w-28 ml-auto rounded-full bg-amber-100 overflow-hidden"><span className="block h-full bg-amber-500" style={{ width: `${Math.round((i.paid / i.amountNum) * 100)}%` }} /></span>
              </span>
            ) : (
              <span className="font-medium"><Money value={i.amountNum} /></span>
            )}
            {i.status !== "PAID" ? (
              <form action={confirmInstallment} className="flex items-center gap-1">
                <input type="hidden" name="event_id" value={eventId} />
                <input type="hidden" name="amount" value={i.remaining.toFixed(2).replace(".", ",")} />
                <input type="hidden" name="paid_at" value={toDateKey(new Date())} />
                <input type="hidden" name="notes" value={`Parcela ${idx + 1} · ${i.label}`} />
                <select name="method" defaultValue="PIX" aria-label="Forma de pagamento" className="h-8 rounded-lg border border-border bg-white px-1.5 text-xs">
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="h-8 rounded-lg bg-emerald-600 px-2.5 text-xs font-medium text-white hover:bg-emerald-700">Recebida</button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
