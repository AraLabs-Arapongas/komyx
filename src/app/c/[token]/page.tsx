import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicFooter } from "@/components/public/public-footer";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { AcceptForm } from "./accept-form";

export const metadata = { title: "Contrato" };

export default async function PublicContractPage({ params }: PageProps<"/c/[token]">) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const admin = createAdminClient();
  const { data: c } = await admin.from("contracts").select("number, content, status, accepted_at, accepted_name, organizations(name, logo_url)").eq("token", token).maybeSingle();
  if (!c || !c.organizations || c.status === "CANCELLED") notFound();
  const org = c.organizations;

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex flex-col items-center px-4 py-8 flex-1">
      <div className="w-full max-w-2xl space-y-5">
        <header className="text-center space-y-2">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="mx-auto h-14 w-14 rounded-2xl object-cover border border-border" />
          ) : <div className="mx-auto h-14 w-14 rounded-2xl bg-brand text-brand-fg grid place-items-center text-xl font-bold">{org.name[0]}</div>}
          <p className="text-sm text-muted">{org.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Contrato nº {c.number}</h1>
          {c.status === "ACCEPTED" ? <Badge tone="green">Aceito por {c.accepted_name} em {formatDateTime(c.accepted_at!)}</Badge> : <Badge tone="amber">Aguardando aceite</Badge>}
        </header>
        <div className="flex justify-center">
          <a href={`/c/${token}/pdf`} className={buttonClass("outline", "sm")}><Download className="h-4 w-4" /> Baixar PDF</a>
        </div>
        <article className="rounded-2xl border border-border bg-surface p-5 sm:p-8">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{c.content}</pre>
        </article>
        {c.status !== "ACCEPTED" ? (
          <div className="rounded-2xl border border-border bg-surface p-5"><AcceptForm token={token} /></div>
        ) : null}
              </div>
          </div>
      <PublicFooter variant="light" orgName={org.name} />
    </main>
  );
}
