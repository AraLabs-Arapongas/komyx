import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { translateDbError } from "@/lib/action-result";
import { decideRequest } from "@/lib/change-requests";

const bodySchema = z.object({
  approve: z.boolean(),
  reply: z.string().trim().max(500).nullable().optional(),
  amount: z.number().positive().optional(),
  price: z.number().min(0).optional(),
});

/**
 * The owner app's door into decideRequest (same rules as the site). Authenticated with the staff
 * member's own Supabase access token (Bearer), so every read and write runs under their RLS.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/change-requests/[id]/decide">) {
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
    await decideRequest({ supabase, org, userId: profile.id }, id, { approve: parsed.data.approve, reply: parsed.data.reply ?? null, amount: parsed.data.amount, price: parsed.data.price });
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as { message: string; code?: string };
    return Response.json({ ok: false, error: err.code ? translateDbError(err) : err.message }, { status: 400 });
  }
}
