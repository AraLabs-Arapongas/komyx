import { createClient } from "@/lib/supabase/server";
import { loadContractPdfData } from "@/lib/pdf/loaders";
import { ContractPdf, pdfResponse } from "@/lib/pdf/documents";

export async function GET(request: Request, { params }: RouteContext<"/eventos/[id]/contrato/pdf">) {
  const { id } = await params;
  const cid = new URL(request.url).searchParams.get("c");
  const supabase = await createClient();
  let contractId = cid;
  if (!contractId) {
    const { data } = await supabase.from("contracts").select("id").eq("event_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    contractId = data?.id ?? null;
  }
  if (!contractId) return new Response("Contrato não encontrado", { status: 404 });
  const data = await loadContractPdfData(supabase, { id: contractId });
  if (!data) return new Response("Contrato não encontrado", { status: 404 });
  return pdfResponse(<ContractPdf data={data} />, `contrato-${data.number}.pdf`);
}
