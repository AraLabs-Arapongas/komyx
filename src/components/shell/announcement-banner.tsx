import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { dismissAnnouncement } from "@/lib/actions/announcements";
import { PendingButton } from "@/components/ui/pending-button";
import { cn } from "@/lib/utils";

const TONES: Record<string, { box: string; link: string }> = {
  info: { box: "bg-brand-soft border-brand/20 text-foreground", link: "text-brand" },
  success: { box: "bg-emerald-50 border-emerald-200 text-emerald-900", link: "text-emerald-700" },
  warning: { box: "bg-amber-50 border-amber-200 text-amber-900", link: "text-amber-800" },
};

/**
 * Komyx announcements at the top of the owner app. RLS returns only the live ones meant for this
 * buffet's plan; the ones this user closed are left out.
 */
export async function AnnouncementBanner({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const [{ data: live }, { data: dismissed }] = await Promise.all([
    supabase.from("platform_announcements").select("id, title, body, tone, link_url, link_label").order("starts_at", { ascending: false }).limit(5),
    supabase.from("announcement_dismissals").select("announcement_id").eq("profile_id", profileId),
  ]);
  const hidden = new Set((dismissed ?? []).map((d) => d.announcement_id));
  const items = (live ?? []).filter((a) => !hidden.has(a.id));
  if (!items.length) return null;
  return (
    <div className="space-y-px">
      {items.map((a) => {
        const t = TONES[a.tone] ?? TONES.info;
        const external = Boolean(a.link_url && !a.link_url.startsWith("/"));
        return (
          <div key={a.id} role="status" data-testid="announcement" className={cn("border-b px-4 py-2.5 pr-28 md:pr-32 text-sm flex items-start gap-3", t.box)}>
            <Megaphone className={cn("h-4 w-4 mt-0.5 shrink-0", t.link)} />
            <div className="min-w-0 flex-1">
              <p><span className="font-semibold">{a.title}</span>{a.body ? <span className="whitespace-pre-line"> · {a.body}</span> : null}</p>
              {a.link_url ? (
                <Link href={a.link_url} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={cn("font-semibold underline underline-offset-2", t.link)}>{a.link_label || "Saiba mais"}</Link>
              ) : null}
            </div>
            <form action={dismissAnnouncement}>
              <input type="hidden" name="id" value={a.id} />
              <PendingButton aria-label="Fechar aviso" className="-m-1 p-1 rounded-lg opacity-60 hover:opacity-100"><X className="h-4 w-4" /></PendingButton>
            </form>
          </div>
        );
      })}
    </div>
  );
}
