import { createClient } from "@/lib/supabase/server";
import { getOrganization, requireProfile } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { NewEventForm } from "./new-event-form";
import { toDateKey } from "@/lib/utils";

export const metadata = { title: "Nova pré-reserva" };

export default async function NewEventPage({ searchParams }: PageProps<"/eventos/novo">) {
  const sp = await searchParams;
  const [org, profile] = await Promise.all([getOrganization(), requireProfile()]);
  const supabase = await createClient();
  const another = sp.another === "1";

  const customerId = typeof sp.customer === "string" ? sp.customer : undefined;
  const requestId = typeof sp.request === "string" ? sp.request : undefined;

  const [packagesRes, customerRes, requestRes] = await Promise.all([
    supabase.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price").eq("active", true).order("sort_order").order("name"),
    customerId ? supabase.from("customers").select("id, name, whatsapp").eq("id", customerId).maybeSingle() : Promise.resolve({ data: null }),
    requestId ? supabase.from("public_requests").select("id, name, whatsapp, desired_date, desired_time, adults, children, participants, message, source, celebrant_name, celebrant_birth_date, package_id, estimated_total").eq("id", requestId).maybeSingle() : Promise.resolve({ data: null }),
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
          request={req ? {
            id: req.id, name: req.name, whatsapp: req.whatsapp, adults: req.adults ?? (req.participants ?? null), children: req.children ?? null, message: req.message,
            source: req.source, celebrant_name: req.celebrant_name, celebrant_birth_date: req.celebrant_birth_date, package_id: req.package_id, estimated_total: req.estimated_total,
          } : null}
          defaults={{ date, start, durationMinutes: org.default_event_duration_minutes }}
          sameDayWarning={another ? "já marcado na agenda" : null}
          isOwner={profile.role === "owner"}
        />
      </PageBody>
    </>
  );
}
