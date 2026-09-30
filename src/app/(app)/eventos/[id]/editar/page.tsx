import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/ui/page";
import { EditEventForm } from "./edit-event-form";
import { toDateKey, toTimeKey } from "@/lib/utils";

export const metadata = { title: "Editar evento" };

export default async function EditEventPage({ params }: PageProps<"/eventos/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: packages }] = await Promise.all([
    supabase.from("events").select("id, title, starts_at, ends_at, estimated_participants, package_id, space, notes").eq("id", id).maybeSingle(),
    supabase.from("packages").select("id, name").eq("active", true).order("sort_order").order("name"),
  ]);
  if (!event) notFound();

  return (
    <>
      <PageHeader title="Editar evento" back={`/eventos/${id}`} />
      <PageBody>
        <EditEventForm
          event={{
            id: event.id,
            title: event.title ?? "",
            date: toDateKey(event.starts_at),
            start: toTimeKey(event.starts_at),
            end: toTimeKey(event.ends_at),
            estimated_participants: event.estimated_participants,
            package_id: event.package_id ?? "",
            space: event.space,
            notes: event.notes ?? "",
          }}
          packages={packages ?? []}
        />
      </PageBody>
    </>
  );
}
