import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicFooter } from "@/components/public/public-footer";
import { appUrl, formatDateLong, formatTime } from "@/lib/utils";
import { InviteEditor } from "./invite-editor";

export const metadata = { title: "Personalizar convite" };

export default async function InviteEditPage({ params }: PageProps<"/i/[token]">) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("token, event_id, events(title, starts_at, ends_at, status, celebrant_name, celebrant_age, invite_image_url, invite_title, invite_message, organizations(name))")
    .eq("token", token)
    .eq("type", "INVITE_EDIT")
    .eq("active", true)
    .maybeSingle();
  if (!link?.events || link.events.status === "CANCELLED") notFound();
  const ev = link.events;
  const { data: guestLink } = await admin.from("public_links").select("token").eq("event_id", link.event_id).eq("type", "GUEST_CONFIRM").eq("active", true).maybeSingle();

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex flex-col items-center px-4 py-8 flex-1">
      <div className="w-full max-w-md space-y-5">
        <header className="space-y-1">
          <p className="text-sm text-muted">{ev.organizations?.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Personalize o convite</h1>
          <p className="text-sm text-muted">{ev.title || (ev.celebrant_name ? `Aniversário de ${ev.celebrant_name}` : "Sua festa")} · {formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}</p>
        </header>
        <InviteEditor token={token} imageUrl={ev.invite_image_url} title={ev.invite_title ?? ""} message={ev.invite_message ?? ""} guestUrl={guestLink ? appUrl(`/g/${guestLink.token}`) : null} />
      </div>
          </div>
      <PublicFooter variant="light" orgName={ev.organizations?.name} />
    </main>
  );
}
