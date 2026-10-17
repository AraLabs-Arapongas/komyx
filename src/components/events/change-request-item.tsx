import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { DecideForm } from "./change-request-decide";

export type ChangeRequestRow = {
  id: string; event_id: string; kind: string; message: string | null; payload: unknown; status: string;
  created_at: string; decided_at: string | null; reply: string | null;
  decider?: { name: string } | null;
  events?: { title: string | null; starts_at: string; adults: number | null; children: number | null; customers: { name: string } | null } | null;
};

/** Columns to select for ChangeRequestRow (with the party, for the inbox). */
export const CHANGE_REQUEST_SELECT = "id, event_id, kind, message, payload, status, created_at, decided_at, reply, decider:profiles(name), events(title, starts_at, adults, children, customers(name))";

export const CHANGE_REQUEST_KIND_LABEL: Record<string, string> = { EXTRA: "Pedido de extra", PEOPLE: "Mudança de pessoas", PAYMENT_NOTICE: "Aviso de pagamento", OTHER: "Pedido" };
const STATUS_LABEL: Record<string, string> = { PENDING: "Aguardando", APPROVED: "Aprovado", REJECTED: "Recusado" };
const STATUS_TONE: Record<string, "amber" | "green" | "red"> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };

type Payload = { description?: string; price?: number; adults?: number; children?: number; amount?: number; txid?: string };

/** One line with what the client asked for, read from the payload. */
function details(r: ChangeRequestRow) {
  const p = (r.payload ?? {}) as Payload;
  if (r.kind === "EXTRA") return [p.description, p.price != null ? formatCurrency(p.price) : null].filter(Boolean).join(" · ");
  if (r.kind === "PEOPLE") {
    const now = r.events ? ` (hoje ${r.events.adults ?? 0} adultos e ${r.events.children ?? 0} crianças)` : "";
    return typeof p.adults === "number" || typeof p.children === "number" ? `${p.adults ?? 0} adultos · ${p.children ?? 0} crianças${now}` : "";
  }
  if (r.kind === "PAYMENT_NOTICE") return [p.amount ? formatCurrency(p.amount) : null, p.txid ?? null].filter(Boolean).join(" · ");
  return p.description ?? "";
}

/** Where the owner actually makes the change; deciding never edits the party by itself. */
function nextStep(r: ChangeRequestRow) {
  if (r.kind === "PEOPLE") return { href: `/eventos/${r.event_id}/editar`, label: "Alterar pessoas" };
  if (r.kind === "EXTRA") return { href: `/eventos/${r.event_id}#extras`, label: "Lançar extra" };
  if (r.kind === "PAYMENT_NOTICE") return { href: `/eventos/${r.event_id}#pagamentos`, label: "Registrar pagamento" };
  return null;
}

export function ChangeRequestItem({ r, showEvent = false }: { r: ChangeRequestRow; showEvent?: boolean }) {
  const line = details(r);
  const step = r.status === "APPROVED" || r.status === "PENDING" ? nextStep(r) : null;
  const ev = r.events;
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{CHANGE_REQUEST_KIND_LABEL[r.kind] ?? "Pedido"}{line ? <span className="font-normal text-muted"> · {line}</span> : null}</p>
          <p className="text-xs text-muted">
            {formatDateTime(r.created_at)}
            {showEvent && ev ? <> · <Link href={`/eventos/${r.event_id}`} className="text-brand hover:underline underline-offset-4">{ev.title ?? `Festa de ${ev.customers?.name ?? "cliente"}`} · {formatDate(ev.starts_at)}</Link></> : null}
          </p>
        </div>
        <Badge tone={STATUS_TONE[r.status] ?? "zinc"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
      </div>
      {r.message ? <p className="text-sm whitespace-pre-wrap bg-stone-50 rounded-xl px-3 py-2">{r.message}</p> : null}
      {r.status === "PENDING" ? <DecideForm id={r.id} /> : (
        <p className={cn("text-sm", r.reply ? "" : "text-muted")}>
          {r.reply ? <>“{r.reply}” </> : null}
          <span className="text-xs text-muted">Respondido{r.decided_at ? ` em ${formatDateTime(r.decided_at)}` : ""}{r.decider?.name ? ` por ${r.decider.name}` : ""}</span>
        </p>
      )}
      {step ? <Link href={step.href} className={buttonClass("ghost", "sm", "-ml-3 text-brand")}>{step.label} →</Link> : null}
    </div>
  );
}
