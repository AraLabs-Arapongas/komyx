import { createClient } from "@/lib/supabase/server";
import { loadQuotePdfData } from "@/lib/pdf/loaders";
import { QuotePdf, pdfResponse } from "@/lib/pdf/documents";

export async function GET(request: Request, { params }: RouteContext<"/eventos/[id]/orcamento/pdf">) {
  const { id } = await params;
  const quoteId = new URL(request.url).searchParams.get("quote");
  const supabase = await createClient();
  let qid = quoteId;
  if (!qid) {
    const { data } = await supabase.from("quotes").select("id").eq("event_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    qid = data?.id ?? null;
  }
  if (!qid) return new Response("Orçamento não encontrado", { status: 404 });
  const data = await loadQuotePdfData(supabase, qid);
  if (!data) return new Response("Orçamento não encontrado", { status: 404 });
  return pdfResponse(<QuotePdf data={data} />, `orcamento-${data.event.title.replace(/[^\w]+/g, "-").toLowerCase()}.pdf`);
}
