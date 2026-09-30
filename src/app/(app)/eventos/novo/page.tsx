import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { NewEventForm } from "./new-event-form";
import { toDateKey } from "@/lib/utils";

export const metadata = { title: "Nova pré-reserva" };

export default async function NewEventPage({ searchParams }: PageProps<"/eventos/novo">) {
  const sp = await searchParams;
  const org = await getOrganization();
  const supabase = await createClient();

  const customerId = typeof sp.customer === "string" ? sp.customer : undefined;
  const requestId = typeof sp.request === "string" ? sp.request : undefined;

  const [packagesRes, customerRes, requestRes] = await Promise.all([
    supabase.from("packages").select("id, name, base_price").eq("active", true).order("sort_order").order("name"),
    customerId ? supabase.from("customers").select("id, name, whatsapp").eq("id", customerId).maybeSingle() : Promise.resolve({ data: null }),
    requestId ? supabase.from("public_requests").select("id, name, whatsapp, desired_date, desired_time, participants, message").eq("id", requestId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const req = requestRes.data;
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : req?.desired_date ?? toDateKey(new Date());
  const start = typeof sp.time === "string" && /^\d{2}:\d{2}$/.test(sp.time) ? sp.time : req?.desired_time ? req.desired_time.slice(0, 5) : "14:00";

  return (
    <>
      <PageHeader title="Nova pré-reserva" subtitle={`Válida por ${org.pre_reservation_validity_hours}h após criada`} back="/agenda" />
      <PageBody>
        <NewEventForm
          packages={packagesRes.data ?? []}
          customer={customerRes.data}
          request={req ? { id: req.id, name: req.name, whatsapp: req.whatsapp, participants: req.participants, message: req.message } : null}
          defaults={{ date, start, durationMinutes: org.default_event_duration_minutes }}
        />
      </PageBody>
    </>
  );
}
