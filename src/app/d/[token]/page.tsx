import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicFooter } from "@/components/public/public-footer";
import { formatCurrency, formatDateLong, formatTime } from "@/lib/utils";
import { DoorBoard } from "./door-board";

export const metadata = { title: "Portaria" };
export const dynamic = "force-dynamic";

export default async function DoorPage({ params }: PageProps<"/d/[token]">) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("token, event_id, organization_id, events(title, starts_at, ends_at, status, adults, children, celebrant_name, customers(name), organizations(name))")
    .eq("token", token)
    .eq("type", "CHECKIN")
    .eq("active", true)
    .maybeSingle();
  if (!link?.events || link.events.status === "CANCELLED") notFound();
  const ev = link.events;
  const [{ data: guests }, { data: extras }, { data: addons }] = await Promise.all([
    admin.from("guests").select("id, name, adults, children, checked_in_at, checked_in_adults, checked_in_children, source, notes").eq("event_id", link.event_id).order("name"),
    admin.from("event_extras").select("id, description, quantity, unit_price, total, created_at").eq("event_id", link.event_id).order("created_at", { ascending: false }),
    admin.from("package_addons").select("id, name, price").eq("organization_id", link.organization_id).eq("active", true).order("sort_order").order("name"),
  ]);
  const extrasTotal = (extras ?? []).reduce((a, x) => a + Number(x.total), 0);
  const title = ev.title || (ev.celebrant_name ? `Aniversário de ${ev.celebrant_name}` : ev.customers ? `Festa de ${ev.customers.name}` : "Festa");

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto max-w-2xl px-4 py-5 space-y-4">
        <header>
          <p className="text-xs text-muted uppercase tracking-wide">{ev.organizations?.name} · Portaria</p>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-muted">{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)} · contratado {ev.adults ?? 0}A {ev.children ?? 0}C</p>
        </header>
        <DoorBoard token={token} guests={guests ?? []} extras={(extras ?? []).map((x) => ({ ...x, total: Number(x.total), unit_price: Number(x.unit_price), quantity: Number(x.quantity) }))} extrasTotalLabel={formatCurrency(extrasTotal)} addons={(addons ?? []).map((a) => ({ ...a, price: Number(a.price) }))} />
      </div>
          <PublicFooter variant="light" orgName={ev.organizations?.name} />
    </main>
  );
}
