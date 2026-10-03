import { createClient } from "@/lib/supabase/server";
import { getOrganization, requireProfile } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { NewEventWizard } from "./new-event-wizard";
import { toDateKey } from "@/lib/utils";
import { loadMenuGroups } from "@/lib/data/menu";
import { parsePicks } from "@/lib/menu";

export const metadata = { title: "Novo orçamento" };

export default async function NewEventPage({ searchParams }: PageProps<"/eventos/novo">) {
  const sp = await searchParams;
  const [org, profile] = await Promise.all([getOrganization(), requireProfile()]);
  const supabase = await createClient();
  const another = sp.another === "1";
  const initialStatus = sp.status === "QUOTE" || sp.status === "CONFIRMED" ? sp.status : "PRE_RESERVED";
  const title = initialStatus === "QUOTE" ? "Novo orçamento" : initialStatus === "CONFIRMED" ? "Novo evento" : "Nova reserva";

  const customerId = typeof sp.customer === "string" ? sp.customer : undefined;
  const requestId = typeof sp.request === "string" ? sp.request : undefined;

  const [packagesRes, addonsRes, customerRes, requestRes, themesRes] = await Promise.all([
    supabase.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price").eq("active", true).order("sort_order").order("name"),
    supabase.from("package_addons").select("id, name, price, description").eq("active", true).order("sort_order").order("name"),
    customerId ? supabase.from("customers").select("id, name, whatsapp").eq("id", customerId).maybeSingle() : Promise.resolve({ data: null }),
    requestId ? supabase.from("public_requests").select("id, name, whatsapp, desired_date, desired_time, adults, children, participants, message, source, celebrant_name, celebrant_birth_date, package_id, theme_id, menu, estimated_total, addons").eq("id", requestId).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("party_themes").select("id, name, description, photo_url").eq("active", true).order("sort_order").order("name"),
  ]);

  const req = requestRes.data;
  const menuGroups = await loadMenuGroups(supabase, { packageIds: (packagesRes.data ?? []).map((p) => p.id) });
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : req?.desired_date ?? toDateKey(new Date());
  const start = typeof sp.time === "string" && /^\d{2}:\d{2}$/.test(sp.time) ? sp.time : req?.desired_time ? req.desired_time.slice(0, 5) : "14:00";

  return (
    <>
      <PageHeader title={title} subtitle="Cliente, data, pacote. O orçamento nasce junto; você decide se reserva a data." back="/agenda" />
      <PageBody>
        <NewEventWizard
          slug={org.slug}
          packages={packagesRes.data ?? []}
          addons={addonsRes.data ?? []}
          themes={themesRes.data ?? []}
          customer={customerRes.data}
          request={req ? {
            id: req.id, name: req.name, whatsapp: req.whatsapp, adults: req.adults ?? (req.participants ?? null), children: req.children ?? null, message: req.message,
            source: req.source, celebrant_name: req.celebrant_name, celebrant_birth_date: req.celebrant_birth_date, package_id: req.package_id, theme_id: req.theme_id, estimated_total: req.estimated_total,
            addons: Array.isArray(req.addons) ? (req.addons as { addon_id: string; quantity: number }[]) : null,
            menu: parsePicks(req.menu),
          } : null}
          menuGroups={menuGroups}
          defaults={{ date, start, durationMinutes: org.default_event_duration_minutes, validityHours: org.pre_reservation_validity_hours, today: toDateKey(new Date()) }}
          sameDayWarning={another ? "já marcado na agenda" : null}
          isOwner={profile.role === "owner"}
          initialStatus={initialStatus}
        />
      </PageBody>
    </>
  );
}
