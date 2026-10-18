"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { uuid } from "./helpers";

/** Hides a platform announcement for the signed-in user (RLS: own rows only). */
export async function dismissAnnouncement(formData: FormData) {
  const profile = await requireProfile();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("announcement_dismissals").upsert({ announcement_id: id.data, profile_id: profile.id }, { onConflict: "announcement_id,profile_id", ignoreDuplicates: true });
  if (error) console.error("[announcements] dismiss", error.message);
  revalidatePath("/", "layout");
}
