import Link from "next/link";
import type { PackagePricing } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { peopleQuoteDelta } from "@/lib/change-requests";
import { DecideForm } from "./change-request-decide";

export type ChangeRequestRow = {
  id: string; event_id: string; kind: string; message: string | null; payload: unknown; status: string;
  created_at: string; decided_at: string | null; reply: string | null;
  decider?: { name: string } | null;
  events?: { title: string | null; starts_at: string; adults: number | null; children: number | null; customers: { name: string } | null; packages?: PackagePricing | null } | null;
};

/** Columns to select for ChangeRequestRow (with the party, for the inbox). */
export const CHANGE_REQUEST_SELECT = "id, event_id, kind, message, payload, status, created_at, decided_at, reply, decider:profiles(name), events(title, starts_at, adults, children, customers(name), packages(id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price))";

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

/** What approving does, in money: shown on the button so the owner knows before clicking. */
function impact(r: ChangeRequestRow): { label: string; amount?: number } | null {
  const p = (r.payload ?? {}) as Payload;
  if (r.kind === "PEOPLE" && r.events) {
    const from = { adults: r.events.adults ?? 0, children: r.events.children ?? 0 };
    const to = { adults: p.adults ?? from.adults, children: p.children ?? from.children };
    const delta = peopleQuoteDelta(r.events.packages ?? null, from, to);
    if (delta === 0) return { label: "Aprovar · sem mudança no valor" };
    return { label: `Aprovar · ${delta > 0 ? "+" : "−"} ${formatCurrency(Math.abs(delta))} no orçamento` };
  }
  if (r.kind === "EXTRA") return { label: `Aprovar · + ${formatCurrency(Number(p.price ?? 0))} nos extras` };
  if (r.kind === "PAYMENT_NOTICE" && p.amount) return { label: `Aprovar · registrar ${formatCurrency(p.amount)}`, amount: p.amount };
  return null;
}

export function ChangeRequestItem({ r, showEvent = false }: { r: ChangeRequestRow; showEvent?: boolean }) {
  const line = details(r);
  const effect = r.status === "PENDING" ? impact(r) : null;
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
      {r.status === "PENDING" ? <DecideForm id={r.id} approveLabel={effect?.label} amount={effect?.amount} /> : (
        <p className={cn("text-sm", r.reply ? "" : "text-muted")}>
          {r.reply ? <>“{r.reply}” </> : null}
          <span className="text-xs text-muted">Respondido{r.decided_at ? ` em ${formatDateTime(r.decided_at)}` : ""}{r.decider?.name ? ` por ${r.decider.name}` : ""}</span>
        </p>
      )}
    </div>
  );
}
