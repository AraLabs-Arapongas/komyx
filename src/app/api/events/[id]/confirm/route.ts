import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { translateDbError } from "@/lib/action-result";
import { confirmEvent } from "@/lib/confirmation";

const bodySchema = z.object({
  confirm: z.boolean().optional(),
  payment: z.object({
    amount: z.number().positive(),
    method: z.enum(["PIX", "CASH", "CARD", "TRANSFER", "OTHER"]).optional(),
    paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().max(500).nullable().optional(),
  }).optional(),
});

/**
 * The app's door into confirmEvent. Authenticated with the staff member's own Supabase access
 * token (Bearer), so every read and write runs under their RLS, exactly like the site.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/events/[id]/confirm">) {
  const { id } = await params;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ ok: false, error: "Faça login de novo." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ ok: false, error: "Dados inválidos." }, { status: 400 });

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await supabase.auth.getUser(token);
  const user = userData.user;
  if (!user) return Response.json({ ok: false, error: "Faça login de novo." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("id, organization_id").eq("id", user.id).maybeSingle();
  if (!profile) return Response.json({ ok: false, error: "Conta sem buffet." }, { status: 403 });
  const { data: org } = await supabase.from("organizations").select("*").eq("id", profile.organization_id).single();
  if (!org || org.status === "suspended") return Response.json({ ok: false, error: "Buffet indisponível." }, { status: 403 });

  try {
    const r = await confirmEvent({ supabase, org, userId: profile.id }, id, parsed.data);
    return Response.json({ ok: true, ...r });
  } catch (e) {
    return Response.json({ ok: false, error: translateDbError(e as { message: string }) }, { status: 400 });
  }
}
