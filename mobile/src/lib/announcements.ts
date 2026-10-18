import { supabase } from "./supabase";

export type Announcement = { id: string; title: string; body: string; tone: "info" | "success" | "warning"; link_url: string | null; link_label: string | null };

/**
 * Komyx announcements for the owner home. RLS returns only the live ones meant for this buffet's
 * plan; the ones this user closed are left out (same as the web banner).
 */
export async function loadAnnouncements(profileId: string): Promise<Announcement[]> {
  const [live, dismissed] = await Promise.all([
    supabase.from("platform_announcements").select("id, title, body, tone, link_url, link_label").order("starts_at", { ascending: false }).limit(5),
    supabase.from("announcement_dismissals").select("announcement_id").eq("profile_id", profileId),
  ]);
  if (live.error) throw live.error;
  const hidden = new Set((dismissed.data ?? []).map((d) => d.announcement_id as string));
  return ((live.data ?? []) as Announcement[]).filter((a) => !hidden.has(a.id));
}

/** Hides an announcement for the signed-in user (RLS: own rows only). */
export async function dismissAnnouncement(id: string, profileId: string) {
  const { error } = await supabase.from("announcement_dismissals").upsert({ announcement_id: id, profile_id: profileId }, { onConflict: "announcement_id,profile_id", ignoreDuplicates: true });
  if (error) throw error;
}
