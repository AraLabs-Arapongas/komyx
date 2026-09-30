import { createAdminClient } from "@/lib/supabase/admin";
import { loadQuotePdfData } from "@/lib/pdf/loaders";
import { QuotePdf, pdfResponse } from "@/lib/pdf/documents";

export async function GET(_request: Request, { params }: RouteContext<"/q/[token]/pdf">) {
  const { token } = await params;
  if (token.length < 20) return new Response("Não encontrado", { status: 404 });
  const admin = createAdminClient();
  const { data: link } = await admin.from("public_links").select("event_id").eq("token", token).eq("type", "QUOTE").eq("active", true).maybeSingle();
  if (!link) return new Response("Não encontrado", { status: 404 });
  const { data: quote } = await admin.from("quotes").select("id").eq("event_id", link.event_id).neq("status", "DRAFT").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!quote) return new Response("Não encontrado", { status: 404 });
  const data = await loadQuotePdfData(admin, quote.id);
  if (!data) return new Response("Não encontrado", { status: 404 });
  return pdfResponse(<QuotePdf data={data} />, `orcamento.pdf`);
}
