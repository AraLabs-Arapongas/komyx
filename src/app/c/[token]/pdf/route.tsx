import { createAdminClient } from "@/lib/supabase/admin";
import { loadContractPdfData } from "@/lib/pdf/loaders";
import { ContractPdf, pdfResponse } from "@/lib/pdf/documents";

export async function GET(_request: Request, { params }: RouteContext<"/c/[token]/pdf">) {
  const { token } = await params;
  if (token.length < 20) return new Response("Não encontrado", { status: 404 });
  const data = await loadContractPdfData(createAdminClient(), { token });
  if (!data || data.status === "CANCELLED") return new Response("Não encontrado", { status: 404 });
  return pdfResponse(<ContractPdf data={data} />, `contrato-${data.number}.pdf`);
}
