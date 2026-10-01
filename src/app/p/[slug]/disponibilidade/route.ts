import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Busy days for a month (YYYY-MM). Returns only date strings; no event details. */
export async function GET(request: Request, { params }: RouteContext<"/p/[slug]/disponibilidade">) {
  const { slug } = await params;
  const m = new URL(request.url).searchParams.get("m") ?? "";
  if (!/^\d{4}-\d{2}$/.test(m)) return NextResponse.json({ error: "m inválido" }, { status: 400 });
  const [y, mo] = m.split("-").map(Number);
  const from = `${m}-01`;
  const to = new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("busy_days", { p_slug: slug, p_from: from, p_to: to });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ month: m, busy: data ?? [] }, { headers: { "Cache-Control": "private, max-age=30" } });
}
