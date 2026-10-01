import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PATH: Record<string, string> = { RESERVATION: "r", QUOTE: "q", GUEST_CONFIRM: "g", INVITE_EDIT: "i", CHECKIN: "d" };

/** Short public link: /o/<short> → the long public page for that link. */
export async function GET(req: Request, ctx: RouteContext<"/o/[short]">) {
  const { short } = await ctx.params;
  if (!/^[A-Za-z0-9]{6,12}$/.test(short)) return new NextResponse("Link inválido", { status: 404 });
  const admin = createAdminClient();
  const { data } = await admin.from("public_links").select("token, type, active").eq("short", short).maybeSingle();
  if (!data || !data.active || !PATH[data.type]) return new NextResponse("Este link não está mais disponível.", { status: 404 });
  return NextResponse.redirect(new URL(`/${PATH[data.type]}/${data.token}`, req.url), 302);
}
