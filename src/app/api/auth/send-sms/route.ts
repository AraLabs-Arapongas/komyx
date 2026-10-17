import { NextResponse } from "next/server";
import { verifyHookSignature } from "@/lib/auth/hook-signature";
import { getSmsProvider } from "@/lib/sms";

/**
 * Supabase Auth "send_sms" hook. Supabase POSTs { user: { phone }, sms: { otp } } signed with the
 * Standard Webhooks scheme (webhook-id, webhook-timestamp, webhook-signature). We verify and forward
 * the code to the configured SMS provider.
 */
export async function POST(req: Request) {
  const secretRaw = process.env.SEND_SMS_HOOK_SECRET ?? "";
  const raw = await req.text();
  if (!verifyHookSignature(req.headers, raw, secretRaw)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const phone = (payload.user?.phone ?? "").replace(/\D/g, "");
  const otp = payload.sms?.otp ?? "";
  if (!phone || !otp) return NextResponse.json({ error: "missing phone/otp" }, { status: 400 });

  try {
    await getSmsProvider().send(phone, `Seu codigo de acesso Komyx: ${otp}\nVale por 10 minutos. Nao compartilhe.`);
  } catch (e) {
    console.error("[send-sms]", e);
    // Supabase surfaces this message to the client.
    return NextResponse.json({ error: { http_code: 500, message: "Não conseguimos enviar o SMS agora. Tente de novo em instantes." } }, { status: 500 });
  }
  return NextResponse.json({});
}
