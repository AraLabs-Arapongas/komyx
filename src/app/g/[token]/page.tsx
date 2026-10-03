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

  const mapsUrl = org.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address)}` : null;

  return (
    <main className="flex-1 flex flex-col bg-[var(--paper)]">
      <div className="flex flex-col items-center px-4 pt-6 pb-10 flex-1">
        <div className="w-full max-w-md space-y-4">
          <article className="overflow-hidden rounded-[28px] bg-[var(--ink)] text-white shadow-lg">
            {ev.invite_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ev.invite_image_url} alt="Convite" className="w-full aspect-square object-cover" />
            ) : (
              <div className="flex justify-center pt-8">
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt={org.name} className="h-16 w-16 rounded-2xl object-cover" />
                ) : <div className="h-16 w-16 rounded-2xl bg-[var(--berry)] grid place-items-center text-2xl font-black">{org.name[0]}</div>}
              </div>
            )}
            <div className="space-y-3 px-6 pt-5 pb-6 text-center">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--sun)]">Você está convidado</p>
              <h1 className="display text-3xl leading-tight">{title}</h1>
              {ev.celebrant_name && ev.celebrant_age != null && !ev.invite_title ? <p className="font-bold text-[var(--sun)]">{ev.celebrant_name} faz {ev.celebrant_age} anos!</p> : null}
              {ev.invite_message ? <p className="text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap">{ev.invite_message}</p> : null}
              <div className="mx-auto grid max-w-xs gap-2 pt-1 text-left text-sm">
                <p className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3 py-2.5"><CalendarDays className="h-5 w-5 shrink-0 text-[var(--sun)]" /><span><span className="font-bold capitalize">{formatDateLong(ev.starts_at)}</span><br />{formatTime(ev.starts_at)} às {formatTime(ev.ends_at)}</span></p>
                <p className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3 py-2.5"><MapPin className="h-5 w-5 shrink-0 text-[var(--sun)]" /><span><span className="font-bold">{org.name}</span>{org.address ? <><br />{org.address}</> : null}</span></p>
              </div>
            </div>
          </article>
          <section className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
            {expired ? <p className="text-center text-sm text-muted">Este link não está mais disponível.</p> : <GuestForm token={link.token} mapsUrl={mapsUrl} />}
          </section>
        </div>
      </div>
      <PublicFooter variant="light" orgName={org.name} />
    </main>
  );
}
