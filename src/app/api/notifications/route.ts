import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Latest notifications for the bell (RLS-scoped). Polled by the client every 30s. */
export async function GET() {
  const supabase = await createClient();
  const [{ data: items }, { data: unread }] = await Promise.all([
    supabase.from("notifications").select("id, type, title, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(8),
    supabase.rpc("unread_notifications_count"),
  ]);
  return NextResponse.json({ items: items ?? [], unread: unread ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST() {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  return NextResponse.json({ ok: true });
}
