import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EventCard, type EventListItem } from "@/components/events/event-card";
import { CustomerForm } from "../customer-form";
import { attachFinancials } from "@/lib/data/financials";
import { whatsappLink } from "@/lib/utils";

export default async function CustomerPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: customer }, { data: eventRows }] = await Promise.all([
    supabase.from("customers").select("id, name, whatsapp, email, notes").eq("id", id).maybeSingle(),
    supabase.from("events").select("id, title, starts_at, ends_at, status, expires_at, estimated_participants, customers(name, whatsapp)").eq("customer_id", id).order("starts_at", { ascending: false }).limit(50),
  ]);
  if (!customer) notFound();
  const events = await attachFinancials(supabase, eventRows);

  return (
    <>
      <PageHeader title={customer.name} back="/clientes" action={
        <a href={whatsappLink(customer.whatsapp)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
      } />
      <PageBody>
        <Card>
          <CardHeader title="Eventos" subtitle={`${events?.length ?? 0} registro(s)`} action={<Link href={`/eventos/novo?customer=${id}`} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Pré-reserva</Link>} />
          <CardBody className="space-y-2">
            {events.length > 0 ? events.map((e) => <EventCard key={e.id} event={e as unknown as EventListItem} />) : <p className="text-sm text-muted">Nenhum evento ainda.</p>}
          </CardBody>
        </Card>
        <h2 className="font-semibold pt-2">Dados do cliente</h2>
        <CustomerForm customer={customer} />
      </PageBody>
    </>
  );
}
