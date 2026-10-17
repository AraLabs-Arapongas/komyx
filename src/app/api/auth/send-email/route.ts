import { NextResponse } from "next/server";
import { verifyHookSignature } from "@/lib/auth/hook-signature";
import { buttonEmail, getEmailProvider } from "@/lib/email";
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
    return NextResponse.json({});
  }

  const url = appUrl(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/nova-senha`);
  const { html, text } = buttonEmail({
    title: "Redefinir sua senha",
    intro: "Recebemos um pedido para criar uma nova senha da sua conta no Komyx. Toque no botão para escolher a nova senha.",
    button: "Criar nova senha",
    url,
    outro: "O link vale por 1 hora. Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.",
  });

  try {
    await getEmailProvider().send({ to, subject: "Redefinir sua senha · Komyx", html, text });
  } catch (e) {
    console.error("[send-email]", e);
    return NextResponse.json({ error: { http_code: 500, message: "Não conseguimos enviar o e-mail agora. Tente de novo em instantes." } }, { status: 500 });
  }
  return NextResponse.json({});
}
