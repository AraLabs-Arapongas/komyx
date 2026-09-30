import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { formatDateLong, formatTime, formatCurrency } from "@/lib/utils";

export type EventListItem = {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  expires_at: string | null;
  estimated_participants: number | null;
  customers: { name: string; whatsapp: string } | null;
  event_financials?: { balance: number | string | null; payment_status: string | null } | null;
};

export function eventTitle(e: { title: string | null; customers: { name: string } | null }) {
  return e.title?.trim() || (e.customers ? `Festa de ${e.customers.name}` : "Evento");
}

export function EventCard({ event, showDate = true }: { event: EventListItem; showDate?: boolean }) {
  const fin = event.event_financials;
  const balance = fin?.balance != null ? Number(fin.balance) : null;
  return (
    <Link href={`/eventos/${event.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-brand/40 active:bg-stone-50 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{eventTitle(event)}</p>
          <p className="text-sm text-muted truncate">{event.customers?.name}</p>
        </div>
        <Badge tone={EVENT_STATUS_TONE[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {showDate ? `${formatDateLong(event.starts_at)} · ` : ""}
          {formatTime(event.starts_at)}–{formatTime(event.ends_at)}
        </span>
        {event.estimated_participants ? (
          <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{event.estimated_participants}</span>
        ) : null}
        {balance !== null && balance > 0 && event.status === "CONFIRMED" ? (
          <span className="text-amber-700 font-medium">Saldo {formatCurrency(balance)}</span>
        ) : null}
      </div>
    </Link>
  );
}
