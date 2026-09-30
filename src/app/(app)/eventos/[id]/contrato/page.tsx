import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Download, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateContractAndGo } from "@/lib/actions/contracts";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { eventTitle } from "@/components/events/event-card";
import { appUrl, formatDateTime, whatsappLink } from "@/lib/utils";
import { ContractEditor, ContractStatusForm } from "./contract-forms";

export const metadata = { title: "Contrato" };

const LABEL: Record<string, string> = { DRAFT: "Rascunho", SENT: "Enviado", ACCEPTED: "Aceito", CANCELLED: "Cancelado" };
const TONE: Record<string, "amber" | "green" | "slate" | "red" | "zinc"> = { DRAFT: "zinc", SENT: "amber", ACCEPTED: "green", CANCELLED: "red" };

export default async function ContractPage({ params, searchParams }: PageProps<"/eventos/[id]/contrato">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("id, title, customers(name, whatsapp)").eq("id", id).maybeSingle();
  if (!event) notFound();

  const cid = typeof sp.c === "string" ? sp.c : null;
  const base = supabase.from("contracts").select("*").eq("event_id", id);
  const { data: contract } = cid ? await base.eq("id", cid).maybeSingle() : await base.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!contract) {
    return (
      <>
        <PageHeader title="Contrato" back={`/eventos/${id}`} />
        <PageBody>
          <form action={generateContractAndGo}><input type="hidden" name="event_id" value={id} /><button className={buttonClass("primary", "lg", "w-full")}>Gerar contrato</button></form>
        </PageBody>
      </>
    );
  }
  if (!cid) redirect(`/eventos/${id}/contrato?c=${contract.id}`);

  const publicUrl = appUrl(`/c/${contract.token}`);
  const pdfUrl = `/eventos/${id}/contrato/pdf?c=${contract.id}`;
  const customer = event.customers!;
  const locked = contract.status === "ACCEPTED";

  return (
    <>
      <PageHeader title={`Contrato nº ${contract.number}`} subtitle={eventTitle(event)} back={`/eventos/${id}`} action={<Badge tone={TONE[contract.status]}>{LABEL[contract.status]}</Badge>} />
      <PageBody>
        <Card>
          <CardHeader title="Compartilhar" subtitle={contract.accepted_at ? `Aceito por ${contract.accepted_name} em ${formatDateTime(contract.accepted_at)}` : "O cliente lê e aceita pelo link; o PDF pode ir por WhatsApp."} />
          <CardBody className="space-y-3">
            <p className="text-xs text-muted break-all">{publicUrl}</p>
            <div className="flex flex-wrap gap-2">
              <a href={pdfUrl} className={buttonClass("primary", "sm")}><Download className="h-4 w-4" /> Baixar PDF</a>
              <CopyButton text={publicUrl} label="Copiar link" />
              <a href={whatsappLink(customer.whatsapp, `Segue o contrato da festa para leitura e aceite: ${publicUrl}`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            </div>
            <ContractStatusForm id={contract.id} eventId={id} status={contract.status} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Texto do contrato" subtitle={locked ? "Contrato aceito: somente leitura. Gere uma nova versão se precisar alterar." : "Preenchido automaticamente. Ajuste o que precisar antes de enviar."} />
          <CardBody>
            {locked ? <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{contract.content}</pre> : <ContractEditor id={contract.id} eventId={id} content={contract.content} />}
          </CardBody>
        </Card>

        <div className="flex gap-2 pb-4">
          <Link href={`/eventos/${id}`} className={buttonClass("outline", "md", "flex-1")}>Voltar ao evento</Link>
          <form action={generateContractAndGo} className="flex-1"><input type="hidden" name="event_id" value={id} /><button className={buttonClass("outline", "md", "w-full")}>Gerar nova versão</button></form>
        </div>
      </PageBody>
    </>
  );
}
