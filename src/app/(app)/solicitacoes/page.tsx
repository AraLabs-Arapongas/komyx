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

export const metadata = { title: "Solicitações" };

export default async function RequestsPage({ searchParams }: PageProps<"/solicitacoes">) {
  const sp = await searchParams;
  const status = sp.status === "CONVERTED" || sp.status === "ARCHIVED" ? sp.status : "NEW";
  const focusId = typeof sp.id === "string" ? sp.id : null;
  const supabase = await createClient();
  const { data: requests } = await supabase.from("public_requests").select("*").eq("status", status).order("created_at", { ascending: false }).limit(100);

  return (
    <>
      <PageHeader title="Solicitações" subtitle="Pedidos de orçamento da página pública. Não bloqueiam a agenda." />
      <PageBody>
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
                  <div><dt className="text-xs text-muted">Estimativa</dt><dd className="font-medium">{r.estimated_total != null ? formatCurrency(r.estimated_total) : "—"}</dd></div>
                </dl>
                {r.message ? <p className="text-sm whitespace-pre-wrap bg-stone-50 rounded-xl p-3">{r.message}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <a href={whatsappLink(r.whatsapp, `Olá ${r.name.split(" ")[0]}! Recebemos sua solicitação de orçamento.`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                  {status === "NEW" ? (
                    <>
                      <Link href={`/eventos/novo?request=${r.id}`} className={buttonClass("primary", "sm")}><CalendarPlus className="h-4 w-4" /> Criar orçamento</Link>
                      <form action={archiveRequest}><input type="hidden" name="id" value={r.id} /><button className={buttonClass("ghost", "sm")}>Arquivar</button></form>
                    </>
                  ) : null}
                  {status === "CONVERTED" && r.event_id ? <Link href={`/eventos/${r.event_id}`} className={buttonClass("outline", "sm")}>Ver evento</Link> : null}
                  {status === "ARCHIVED" ? <form action={reopenRequest}><input type="hidden" name="id" value={r.id} /><button className={buttonClass("ghost", "sm")}>Reabrir</button></form> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title="Nenhuma solicitação" description="Divulgue sua página pública para receber pedidos de orçamento." />}
      </PageBody>
    </>
  );
}
