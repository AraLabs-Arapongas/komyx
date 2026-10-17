import Link from "next/link";
import { MessageCircle, CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { archiveRequest, reopenRequest } from "@/lib/actions/requests";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn, formatCurrency, formatDateTime, formatPhone, whatsappLink } from "@/lib/utils";
import { occasionLabel } from "@/lib/labels";
import { leadSourceLabel } from "@/lib/pricing";
import { ClientRequests } from "./client-requests";
import { PendingButton } from "@/components/ui/pending-button";

export const metadata = { title: "Solicitações" };

export default async function RequestsPage({ searchParams }: PageProps<"/solicitacoes">) {
  const sp = await searchParams;
  const tab = sp.tab === "clientes" ? "clientes" : "orcamentos";
  const status = sp.status === "CONVERTED" || sp.status === "ARCHIVED" ? sp.status : "NEW";
  const focusId = typeof sp.id === "string" ? sp.id : null;
  const supabase = await createClient();
  const [{ data: requests }, { count: pendingClient }] = await Promise.all([
    tab === "orcamentos" ? supabase.from("public_requests").select("*, party_themes(name)").eq("status", status).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: null }),
    supabase.from("event_change_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
  ]);

  // Two inboxes: quote requests from the public page, and requests from clients with a party (app).
  const tabs = (
    <div className="flex gap-1 border-b border-border">
      {([["orcamentos", "Pedidos de orçamento", 0], ["clientes", "Pedidos de clientes", pendingClient ?? 0]] as const).map(([k, l, n]) => (
        <Link key={k} href={k === "clientes" ? "/solicitacoes?tab=clientes" : "/solicitacoes"} className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5", tab === k ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground")}>
          {l}{n > 0 ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-brand-fg text-[11px] font-semibold grid place-items-center">{n}</span> : null}
        </Link>
      ))}
    </div>
  );

  if (tab === "clientes") {
    return (
      <>
        <PageHeader title="Solicitações" subtitle="Pedidos dos clientes pelo app da festa. Aprovar aplica o pedido na festa e no valor." />
        <PageBody>
          {tabs}
          <ClientRequests answered={sp.f === "respondidos"} />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Solicitações" subtitle="Pedidos de orçamento da página pública. Não bloqueiam a agenda." />
      <PageBody>
        {tabs}
        {focusId ? <script dangerouslySetInnerHTML={{ __html: `document.getElementById(${JSON.stringify(focusId)})?.scrollIntoView({block:"start"})` }} /> : null}
        <div className="flex gap-2">
          {[["NEW", "Novas"], ["CONVERTED", "Convertidas"], ["ARCHIVED", "Arquivadas"]].map(([k, l]) => (
            <Link key={k} href={`/solicitacoes?status=${k}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium border", status === k ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>{l}</Link>
          ))}
        </div>
        {requests && requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} id={r.id} className={cn("rounded-2xl border bg-surface p-4 space-y-3 scroll-mt-20", focusId === r.id ? "border-brand ring-2 ring-brand/30" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted">{formatPhone(r.whatsapp)} · {formatDateTime(r.created_at)}</p>
                  </div>
                  <Badge tone={status === "NEW" ? "amber" : status === "CONVERTED" ? "green" : "zinc"}>{status === "NEW" ? "Nova" : status === "CONVERTED" ? "Convertida" : "Arquivada"}</Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-muted">Data desejada</dt><dd className="font-medium">{r.desired_date ? r.desired_date.split("-").reverse().join("/") : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Horário</dt><dd className="font-medium">{r.desired_time ? r.desired_time.slice(0, 5) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Pessoas</dt><dd className="font-medium">{r.adults != null || r.children != null ? `${r.adults ?? 0}A ${r.children ?? 0}C` : r.participants ?? "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Origem</dt><dd className="font-medium">{leadSourceLabel(r.source)}</dd></div>
                  <div><dt className="text-xs text-muted">Ocasião</dt><dd className="font-medium">{occasionLabel(r.occasion ?? (r.celebrant_name ? "BIRTHDAY" : null))}{(r.occasion ?? "BIRTHDAY") === "BIRTHDAY" && r.celebrant_name ? <span className="text-muted font-normal"> · {r.celebrant_name}</span> : null}</dd></div>
                  {r.party_themes ? <div><dt className="text-xs text-muted">Tema</dt><dd className="font-medium">{r.party_themes.name}</dd></div> : null}
                  <div><dt className="text-xs text-muted">Estimativa</dt><dd className="font-medium">{r.estimated_total != null ? formatCurrency(r.estimated_total) : "—"}</dd></div>
                </dl>
                {r.message ? <p className="text-sm whitespace-pre-wrap bg-stone-50 rounded-xl p-3">{r.message}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <a href={whatsappLink(r.whatsapp, `Olá ${r.name.split(" ")[0]}! Recebemos sua solicitação de orçamento.`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                  {status === "NEW" ? (
                    <>
                      <Link href={`/eventos/novo?request=${r.id}`} className={buttonClass("primary", "sm")}><CalendarPlus className="h-4 w-4" /> Criar orçamento</Link>
                      <form action={archiveRequest}><input type="hidden" name="id" value={r.id} /><PendingButton className={buttonClass("ghost", "sm")}>Arquivar</PendingButton></form>
                    </>
                  ) : null}
                  {status === "CONVERTED" && r.event_id ? <Link href={`/eventos/${r.event_id}`} className={buttonClass("outline", "sm")}>Ver evento</Link> : null}
                  {status === "ARCHIVED" ? <form action={reopenRequest}><input type="hidden" name="id" value={r.id} /><PendingButton className={buttonClass("ghost", "sm")}>Reabrir</PendingButton></form> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="Nenhuma solicitação" description="Divulgue sua página pública para receber pedidos de orçamento." />}
      </PageBody>
    </>
  );
}
