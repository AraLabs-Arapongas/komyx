import { createClient } from "@/lib/supabase/server";
import { expirePreReservations } from "@/lib/actions/events";
import { PageBody, PageHeader } from "@/components/ui/page";
import { AgendaView, type AgendaEvent } from "./agenda-view";
import { toDateKey } from "@/lib/utils";

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const sp = await searchParams;
  await expirePreReservations();
  const supabase = await createClient();

  const todayKey = toDateKey(new Date());
  const monthParam = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : todayKey.slice(0, 7);
  const view = sp.view === "month" || sp.view === "week" ? sp.view : "list";

  // Load a wide window (previous month .. next month) so navigation stays snappy.
  const [y, m] = monthParam.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 2, 1)).toISOString();
  const to = new Date(Date.UTC(y, m + 1, 1)).toISOString();

  const { data } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, status, expires_at, estimated_participants, space, customers(name)")
    .gte("starts_at", from)
    .lt("starts_at", to)
    .in("status", ["PRE_RESERVED", "CONFIRMED", "DONE"])
    .order("starts_at");

  return (
    <>
      <PageHeader title="Agenda" />
      <PageBody>
        <AgendaView events={(data ?? []) as AgendaEvent[]} month={monthParam} today={todayKey} initialView={view} />
      </PageBody>
    </>
  );
}
