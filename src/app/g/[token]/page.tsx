import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicFooter } from "@/components/public/public-footer";
import { formatDateLong, formatTime } from "@/lib/utils";
import { GuestForm } from "./guest-form";

export const metadata = { title: "Confirmar presença" };

export default async function GuestConfirmPage({ params }: PageProps<"/g/[token]">) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("token, expires_at, events(title, starts_at, ends_at, status, celebrant_name, celebrant_age, invite_image_url, invite_title, invite_message, customers(name), organizations(name, address, logo_url))")
    .eq("token", token)
    .eq("type", "GUEST_CONFIRM")
    .eq("active", true)
    .maybeSingle();
  if (!link || !link.events) notFound();
  const ev = link.events;
  const org = ev.organizations!;
  const expired = (link.expires_at && new Date(link.expires_at) < new Date()) || ev.status === "CANCELLED";
  const title = ev.invite_title?.trim() || ev.title?.trim() || (ev.celebrant_name ? `Aniversário de ${ev.celebrant_name}` : ev.customers ? `Festa de ${ev.customers.name}` : "Festa");

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex flex-col items-center px-4 py-8 flex-1">
      <div className="w-full max-w-md space-y-5">
        {ev.invite_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.invite_image_url} alt="Convite" className="w-full rounded-2xl border border-border shadow-sm" />
        ) : null}
        <header className="text-center space-y-2">
          {!ev.invite_image_url ? (org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="mx-auto h-16 w-16 rounded-2xl object-cover border border-border" />
          ) : <div className="mx-auto h-16 w-16 rounded-2xl bg-brand text-brand-fg grid place-items-center text-2xl font-bold">{org.name[0]}</div>) : null}
          <p className="text-sm text-muted">Você está convidado para</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {ev.celebrant_name && ev.celebrant_age != null && !ev.invite_title ? <p className="text-brand font-medium">{ev.celebrant_name} faz {ev.celebrant_age} anos!</p> : null}
          {ev.invite_message ? <p className="text-sm whitespace-pre-wrap">{ev.invite_message}</p> : null}
          <p className="inline-flex items-center gap-1.5 text-sm"><CalendarDays className="h-4 w-4 text-brand" /> {formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</p>
          <p className="text-sm text-muted">{org.name}{org.address ? <> · <MapPin className="inline h-4 w-4" /> {org.address}</> : null}</p>
        </header>
        <div className="rounded-2xl border border-border bg-surface p-5">
          {expired ? <p className="text-center text-sm text-muted">Este link não está mais disponível.</p> : <GuestForm token={link.token} />}
        </div>
      </div>
          </div>
      <PublicFooter variant="light" orgName={org.name} />
    </main>
  );
}
