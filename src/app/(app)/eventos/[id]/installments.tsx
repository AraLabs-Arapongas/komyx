import { Check } from "lucide-react";
import { confirmInstallment } from "@/lib/actions/guests-payments";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { allocateInstallments, dueShort, INSTALLMENT_STATUS_LABEL, INSTALLMENT_STATUS_TONE, type InstallmentLike } from "@/lib/installments";
import { PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { toDateKey } from "@/lib/utils";

/** Installment plan of the latest quote with paid/pending status and a one-click "Recebida" per open installment. */
export function Installments({ eventId, installments, paidTotal, eventStartsAt, acceptedAt }: { eventId: string; installments: InstallmentLike[]; paidTotal: number; eventStartsAt: string; acceptedAt?: string | null }) {
  if (installments.length === 0) return null;
  const rows = allocateInstallments(installments, paidTotal, eventStartsAt, acceptedAt);
  return (
    <ul className="divide-y divide-border">
      {rows.map((i, idx) => (
        <li key={idx} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 py-1.5 text-sm">
          <div className="min-w-0 flex items-center gap-2">
            {i.status === "PAID" ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-border" />}
            <span className="truncate"><span className="font-medium">{idx + 1}. {i.label}</span> <span className="text-muted">· {dueShort(i.due)}</span></span>
            <Badge tone={INSTALLMENT_STATUS_TONE[i.status]}>{INSTALLMENT_STATUS_LABEL[i.status]}</Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-medium"><Money value={i.amountNum} />{i.status === "PARTIAL" ? <span className="text-xs text-muted"> · falta <Money value={i.remaining} /></span> : null}</span>
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
