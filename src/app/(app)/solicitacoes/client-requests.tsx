import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/page";
import { ChangeRequestItem, CHANGE_REQUEST_SELECT, type ChangeRequestRow } from "@/components/events/change-request-item";
import { cn } from "@/lib/utils";

/** Requests sent by clients from the app ("Minha festa"): pending first, answered ones in their own filter. */
export async function ClientRequests({ answered }: { answered: boolean }) {
  const supabase = await createClient();
  let q = supabase.from("event_change_requests").select(CHANGE_REQUEST_SELECT).order(answered ? "decided_at" : "created_at", { ascending: false }).limit(100);
  q = answered ? q.neq("status", "PENDING") : q.eq("status", "PENDING");
  const { data } = await q;
  const rows = (data ?? []) as unknown as ChangeRequestRow[];

  return (
    <>
      <div className="flex gap-2">
        {[["pendentes", "Aguardando"], ["respondidos", "Respondidos"]].map(([k, l]) => (
          <Link key={k} href={`/solicitacoes?tab=clientes&f=${k}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium border", answered === (k === "respondidos") ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>{l}</Link>
        ))}
      </div>
      {rows.length > 0 ? (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} id={r.id} className="rounded-2xl border border-border bg-surface p-4 scroll-mt-20">
              <ChangeRequestItem r={r} showEvent />
            </div>
          ))}
        </div>
      ) : <EmptyState title={answered ? "Nenhum pedido respondido" : "Nenhum pedido aguardando"} description="Os clientes pedem extras, mais pessoas ou avisam pagamento pelo app da festa." />}
    </>
  );
}
