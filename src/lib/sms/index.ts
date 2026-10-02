import "server-only";

/**
 * SMS providers behind the Supabase "send_sms" auth hook.
 * Switch with SMS_PROVIDER: "comtele" (production) or "log" (dev: prints the message).
 */
export type SmsProvider = { send(phoneE164Digits: string, message: string): Promise<void> };

const log: SmsProvider = {
  async send(phone, message) {
    console.log(`[sms:log] to +${phone}: ${message}`);
  },
};

// Comtele API (https://developers.comtele.com.br): POST /messages/sms/send with x-api-key.
const comtele: SmsProvider = {
  async send(phone, message) {
    const key = process.env.COMTELE_API_KEY;
    if (!key) throw new Error("COMTELE_API_KEY não configurada");
    const res = await fetch("https://api.comtele.com.br/messages/sms/send", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        receivers: [phone],
        contactGroups: [],
        message,
        route: Number(process.env.COMTELE_ROUTE ?? 17),
        tag: "komyx-otp",
        custom: "login",
      }),
    });
    const body = (await res.json().catch(() => null)) as { hasError?: boolean; message?: string; errors?: unknown } | null;
    if (!res.ok || body?.hasError) throw new Error(`Comtele: ${res.status} ${body?.message ?? ""} ${JSON.stringify(body?.errors ?? "")}`.trim());
  },
};

export function getSmsProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER ?? "log";
  if (name === "comtele") return comtele;
  return log;
}
