import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";
import { DEFAULT_TEMPLATES, renderCopy, type TemplateCopy, type TemplateKey, type TemplateVars } from "./template-copy";

export { DEFAULT_TEMPLATES, type TemplateKey, type TemplateVars } from "./template-copy";

/** The admin-edited copy for a key (email_templates), or the in-code default when missing or unreadable. */
export async function loadTemplate(key: TemplateKey): Promise<TemplateCopy> {
  const d = DEFAULT_TEMPLATES[key];
  try {
    const { data } = await createAdminClient().from("email_templates").select("subject, title, intro, button, outro").eq("key", key).maybeSingle();
    if (data) return data;
  } catch (e) {
    console.error("[email-templates]", key, e);
  }
  return { subject: d.subject, title: d.title, intro: d.intro, button: d.button, outro: d.outro };
}

/** Renders an e-mail from its template: { subject, html, text }. */
export async function renderTemplate(key: TemplateKey, vars: TemplateVars) {
  return renderCopy(await loadTemplate(key), vars);
}

const NOTIFICATION_KEYS: Partial<Record<string, TemplateKey>> = {
  request: "request",
  reservation: "reservation",
  contract_accepted: "contract_accepted",
  client_request: "client_request",
};

/** The team e-mail for a notification row (used when it is created and by the admin resend). */
export function renderNotificationEmail(n: { type: string; title: string; body: string | null; href: string | null }, buffet: string) {
  return renderTemplate(NOTIFICATION_KEYS[n.type] ?? "other", {
    buffet,
    // The DB title repeats the subject for some kinds ("Novo pedido de orçamento: Ana"); keep the who.
    quem: n.title.replace(/^(Novo pedido de orçamento|Reserva online):\s*/, ""),
    detalhes: n.body?.replace(/^\s*·\s*/, "").trim() ?? "",
    link: appUrl(n.href ?? "/notificacoes"),
  });
}
