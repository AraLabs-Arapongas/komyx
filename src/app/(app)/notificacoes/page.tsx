import Link from "next/link";
import { Bell, Inbox, CalendarCheck, FileSignature} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Notificações" };

const ICONS: Record<string, typeof Bell> = { request: Inbox, reservation: CalendarCheck, contract_accepted: FileSignature };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: items } = await supabase.from("notifications").select("id, type, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  const unread = (items ?? []).filter((n) => !n.read_at).length;
  return (
    <>
      <PageHeader title="Notificações" subtitle={unread ? `${unread} não lida(s)` : "Tudo lido"} action={unread ? <form action={markAllNotificationsRead}><button className={buttonClass("outline", "sm")}>Marcar todas como lidas</button></form> : null} />
      <PageBody>
        {items && items.length ? (
          <ul className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              return (
                <li key={n.id} className={cn("flex gap-3 px-4 py-3", !n.read_at && "bg-brand-soft/40")}>
                  <Icon className="h-5 w-5 mt-0.5 text-brand shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Link href={n.href ?? "#"} className="font-medium hover:underline">{n.title}</Link>
                    {n.body ? <p className="text-sm text-muted">{n.body}</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
                  </div>
                  {!n.read_at ? <form action={markNotificationRead}><input type="hidden" name="id" value={n.id} /><button className="text-xs text-muted hover:text-foreground">Lida</button></form> : null}
                </li>
              );
            })}
          </ul>
        ) : <EmptyState title="Nenhuma notificação" description="Pedidos de orçamento, reservas online e contratos aceitos aparecem aqui." />}
      </PageBody>
    </>
  );
}
