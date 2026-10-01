import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSmsProvider } from "@/lib/sms";

/**
 * Supabase Auth "send_sms" hook. Supabase POSTs { user: { phone }, sms: { otp } } signed with the
 * Standard Webhooks scheme (webhook-id, webhook-timestamp, webhook-signature). We verify and forward
 * the code to the configured SMS provider.
 */
export async function POST(req: Request) {
  const secretRaw = process.env.SEND_SMS_HOOK_SECRET ?? "";
  const raw = await req.text();
  if (!verify(req.headers, raw, secretRaw)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const phone = (payload.user?.phone ?? "").replace(/\D/g, "");
  const otp = payload.sms?.otp ?? "";
  if (!phone || !otp) return NextResponse.json({ error: "missing phone/otp" }, { status: 400 });

  try {
    await getSmsProvider().send(phone, `Seu codigo de acesso Festeja: ${otp}\nVale por 10 minutos. Nao compartilhe.`);
  } catch (e) {
    console.error("[send-sms]", e);
    // Supabase surfaces this message to the client.
    return NextResponse.json({ error: { http_code: 500, message: "Não conseguimos enviar o SMS agora. Tente de novo em instantes." } }, { status: 500 });
  }
  return NextResponse.json({});
}

/** Standard Webhooks signature check. Secret format: "v1,whsec_<base64>" (several may be comma-separated). */
function verify(headers: Headers, body: string, secrets: string) {
  const id = headers.get("webhook-id");
  const ts = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !ts || !sigHeader || !secrets) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const keys = secrets.split("|").map((s) => s.trim()).filter(Boolean);
  const provided = sigHeader.split(" ").map((p) => p.split(",")[1] ?? "").filter(Boolean);
  for (const k of keys) {
    const b64 = k.replace(/^v1,/, "").replace(/^whsec_/, "");
    const expected = createHmac("sha256", Buffer.from(b64, "base64")).update(`${id}.${ts}.${body}`).digest("base64");
    for (const p of provided) {
      const a = Buffer.from(expected); const b = Buffer.from(p);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    }
  }
  return false;
}
