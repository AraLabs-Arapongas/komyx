import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateLong, formatTime } from "@/lib/utils";
import { GuestForm } from "./guest-form";

export const metadata = { title: "Confirmar presença" };

export default async function GuestConfirmPage({ params }: PageProps<"/g/[token]">) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("token, expires_at, events(title, starts_at, ends_at, status, customers(name), organizations(name, address, logo_url))")
    .eq("token", token)
    .eq("type", "GUEST_CONFIRM")
    .eq("active", true)
    .maybeSingle();
  if (!link || !link.events) notFound();
  const ev = link.events;
  const org = ev.organizations!;
  const expired = (link.expires_at && new Date(link.expires_at) < new Date()) || ev.status === "CANCELLED";
  const title = ev.title?.trim() || (ev.customers ? `Festa de ${ev.customers.name}` : "Festa");

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <header className="text-center space-y-2">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="mx-auto h-16 w-16 rounded-2xl object-cover border border-border" />
          ) : <div className="mx-auto h-16 w-16 rounded-2xl bg-brand text-brand-fg grid place-items-center text-2xl font-bold">{org.name[0]}</div>}
          <p className="text-sm text-muted">{org.name} convida você para</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="inline-flex items-center gap-1.5 text-sm"><CalendarDays className="h-4 w-4 text-brand" /> {formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</p>
          {org.address ? <p className="inline-flex items-center gap-1.5 text-sm text-muted"><MapPin className="h-4 w-4" /> {org.address}</p> : null}
        </header>
        <div className="rounded-2xl border border-border bg-surface p-5">
          {expired ? <p className="text-center text-sm text-muted">Este link não está mais disponível.</p> : <GuestForm token={link.token} />}
        </div>
      </div>
    </main>
  );
}
