import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Camera, MessageCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, whatsappLink } from "@/lib/utils";
import { RequestForm } from "./request-form";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("name, description").eq("slug", slug).maybeSingle();
  return { title: org ? `${org.name}` : "Buffet", description: org?.description ?? undefined };
}

export default async function PublicBuffetPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, logo_url, cover_url, whatsapp, address, instagram, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) notFound();
  const { data: packages } = await admin.from("packages").select("id, name, base_price, included_participants, additional_participant_price, description").eq("organization_id", org.id).eq("active", true).order("sort_order").order("name");

  return (
    <main className="flex-1 bg-background">
      <div className="relative h-44 sm:h-60 bg-gradient-to-br from-orange-200 via-amber-100 to-rose-100">
        {org.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="mx-auto max-w-2xl px-4 -mt-10 pb-16 space-y-6">
        <header className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-start gap-4">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-16 w-16 rounded-2xl object-cover border border-border bg-surface -mt-12" />
            ) : <div className="h-16 w-16 rounded-2xl bg-brand text-brand-fg grid place-items-center text-2xl font-bold -mt-12 border border-border">{org.name[0]}</div>}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
              {org.description ? <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{org.description}</p> : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {org.address ? <span className="inline-flex items-center gap-1.5 text-muted"><MapPin className="h-4 w-4" /> {org.address}</span> : null}
            {org.instagram ? <a href={`https://instagram.com/${org.instagram}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-brand"><Camera className="h-4 w-4" /> @{org.instagram}</a> : null}
          </div>
          {org.whatsapp ? (
            <a href={whatsappLink(org.whatsapp, `Olá! Vi a página do ${org.name} e gostaria de um orçamento.`)} target="_blank" rel="noopener" className={buttonClass("primary", "lg", "w-full mt-4")}>
              <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
            </a>
          ) : null}
        </header>

        {packages && packages.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Pacotes</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-surface p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-brand font-semibold text-lg mt-1">{formatCurrency(p.base_price)}</p>
                  <p className="text-xs text-muted">{p.included_participants > 0 ? `até ${p.included_participants} participantes` : ""}{Number(p.additional_participant_price) > 0 ? ` · +${formatCurrency(p.additional_participant_price)} por extra` : ""}</p>
                  {p.description ? <p className="text-sm text-muted mt-2 whitespace-pre-wrap">{p.description}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section id="orcamento" className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Solicitar orçamento</h2>
            <p className="text-sm text-muted">Conte sobre a sua festa. Respondemos pelo WhatsApp.</p>
          </div>
          <RequestForm slug={org.slug} />
        </section>

        <p className="text-center text-xs text-muted">Gestão por Festeja</p>
      </div>
    </main>
  );
}
