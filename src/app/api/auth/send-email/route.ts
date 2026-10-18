import { NextResponse } from "next/server";
import { verifyHookSignature } from "@/lib/auth/hook-signature";
import { renderTemplate } from "@/lib/email/templates";
import { logMessage, sendLoggedEmail } from "@/lib/email/message-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";

type Payload = {
  user?: { email?: string };
  email_data?: { token_hash?: string; email_action_type?: string };
};

/**
 * Supabase Auth "send_email" hook. Supabase POSTs { user, email_data } signed with the Standard
 * Webhooks scheme; we render the email ourselves and send it through the configured provider.
 * Only password recovery is used by the app (signup confirmations are off, there is no magic
 * link or email change UI), so other action types are logged and skipped.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyHookSignature(req.headers, raw, process.env.SEND_EMAIL_HOOK_SECRET ?? "")) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let payload: Payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const to = payload.user?.email ?? "";
  const type = payload.email_data?.email_action_type ?? "";
  const tokenHash = payload.email_data?.token_hash ?? "";
  if (!to || !tokenHash) return NextResponse.json({ error: "missing email/token" }, { status: 400 });

  if (type !== "recovery") {
    console.warn(`[send-email] skipped unsupported action type "${type}" for ${to}`);
    await logMessage({ channel: "email", kind: "auth", to, subject: `Tipo não suportado: ${type || "?"}`, status: "skipped" });
    return NextResponse.json({});
  }

  const url = appUrl(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/nova-senha`);
  const [{ subject, html, text }, organizationId] = await Promise.all([renderTemplate("password_reset", { link: url }), orgOf(to)]);
  const sent = await sendLoggedEmail({ to, subject, html, text }, { kind: "password_reset", organizationId });
  if (!sent.ok) {
    console.error("[send-email]", sent.error);
    return NextResponse.json({ error: { http_code: 500, message: "Não conseguimos enviar o e-mail agora. Tente de novo em instantes." } }, { status: 500 });
  }
  return NextResponse.json({});
}

// For the message log only: the buffet of whoever asked (none for unknown addresses).
async function orgOf(email: string) {
  try {
    const { data } = await createAdminClient().from("profiles").select("organization_id").eq("email", email).limit(1).maybeSingle();
    return data?.organization_id ?? null;
  } catch {
    return null;
  }
}
