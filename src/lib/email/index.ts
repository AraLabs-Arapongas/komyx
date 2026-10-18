import "server-only";

/**
 * Email providers behind the Supabase "send_email" auth hook (and, later, app notifications).
 * Switch with EMAIL_PROVIDER: "resend" (production) or "log" (dev: prints the message).
 */
export type Email = { to: string; subject: string; html: string; text: string };
export type EmailProvider = { send(email: Email): Promise<void> };

const FROM = process.env.EMAIL_FROM ?? "Komyx <nao-responda@komyx.com.br>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "contato@komyx.com.br";

const log: EmailProvider = {
  async send({ to, subject, text }) {
    console.log(`[email:log] to ${to} · ${subject}\n${text}`);
  },
};

// Resend API (https://resend.com/docs/api-reference/emails/send-email).
const resend: EmailProvider = {
  async send({ to, subject, html, text }) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY não configurada");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text }),
    });
    if (!res.ok) throw new Error(`Resend: ${res.status} ${await res.text().catch(() => "")}`.trim());
  },
};

export function getEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === "resend" ? resend : log;
}

export { buttonEmail } from "./layout";
