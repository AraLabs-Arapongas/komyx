import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Standard Webhooks signature check used by the Supabase Auth hooks (send_sms, send_email).
 * Secret format: "v1,whsec_<base64>"; several may be separated by "|".
 */
export function verifyHookSignature(headers: Headers, body: string, secrets: string) {
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
