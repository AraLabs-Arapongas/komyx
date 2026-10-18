import { buttonEmail, type EmailAside, type EmailRow } from "./layout";

// No "server-only": shared by the senders and the admin editor's live preview.

export const TEMPLATE_KEYS = ["request", "reservation", "contract_accepted", "client_request", "other", "password_reset", "announcement", "client_summary_request", "client_summary_reservation"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateCopy = { subject: string; title: string; intro: string; button: string; outro: string };
export type TemplateVars = { buffet?: string; quem?: string; detalhes?: string; link: string };

const TEAM_OUTRO = "Você recebe este aviso por fazer parte da equipe do {{buffet}}. Para não receber mais, desligue em Minha conta.";

/** Same copy as the seed in 20261018140000_admin_platform.sql: used when the row is missing. */
export const DEFAULT_TEMPLATES: Record<TemplateKey, TemplateCopy & { name: string; description: string }> = {
  request: { name: "Novo pedido de orçamento", description: "Para a equipe do buffet quando chega um pedido pela página pública.", subject: "Novo pedido de orçamento · {{buffet}}", title: "Novo pedido de orçamento", intro: "{{quem}} · {{detalhes}}.", button: "Ver pedido", outro: TEAM_OUTRO },
  reservation: { name: "Nova reserva online", description: "Para a equipe quando um cliente reserva a data e vai pagar o sinal por Pix.", subject: "Nova reserva online · {{buffet}}", title: "Nova reserva online", intro: "{{quem}} · {{detalhes}}.", button: "Ver reserva", outro: TEAM_OUTRO },
  contract_accepted: { name: "Contrato aceito", description: "Para a equipe quando o cliente aceita o contrato pelo link.", subject: "Contrato aceito · {{buffet}}", title: "Contrato aceito", intro: "{{quem}} · {{detalhes}}.", button: "Ver contrato", outro: TEAM_OUTRO },
  client_request: { name: "Pedido do cliente", description: "Para a equipe quando o cliente pede uma mudança ou avisa um pagamento.", subject: "Novo pedido do cliente · {{buffet}}", title: "Novo pedido do cliente", intro: "{{quem}} · {{detalhes}}.", button: "Ver festa", outro: TEAM_OUTRO },
  other: { name: "Outros avisos", description: "Qualquer outro aviso para a equipe.", subject: "Novo aviso · {{buffet}}", title: "Novo aviso", intro: "{{quem}} · {{detalhes}}.", button: "Abrir no Komyx", outro: TEAM_OUTRO },
  password_reset: { name: "Redefinir senha", description: "Quando alguém pede \"Esqueci minha senha\" (ou o admin reenvia).", subject: "Redefinir sua senha · Komyx", title: "Redefinir sua senha", intro: "Recebemos um pedido para criar uma nova senha da sua conta no Komyx. Toque no botão para escolher a nova senha.", button: "Criar nova senha", outro: "O link vale por 1 hora. Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma." },
  client_summary_request: { name: "Resumo para o cliente (pedido)", description: "Para o cliente que deixou o e-mail ao pedir orçamento. {{quem}} é o primeiro nome. O resumo da festa e o bloco do app entram sozinhos.", subject: "Recebemos seu pedido · {{buffet}}", title: "Recebemos seu pedido", intro: "Oi, {{quem}}! O {{buffet}} recebeu seu pedido de orçamento e responde em breve pelo WhatsApp. Confira o que você escolheu:", button: "Falar com o buffet", outro: "Você recebe este e-mail porque pediu um orçamento na página do {{buffet}}." },
  client_summary_reservation: { name: "Resumo para o cliente (reserva)", description: "Para o cliente que reservou a data pela página. {{quem}} é o primeiro nome e {{detalhes}} o prazo para pagar o sinal. O resumo e o bloco do app entram sozinhos.", subject: "Data reservada · {{buffet}}", title: "Sua data está reservada", intro: "Oi, {{quem}}! Sua data no {{buffet}} está segura. {{detalhes}} Confira o resumo:", button: "Ver minha reserva", outro: "Guarde este e-mail: o link da reserva tem o Pix, o orçamento e o contrato." },
  announcement: { name: "Aviso da Komyx", description: "Avisos da plataforma enviados por e-mail aos donos dos buffets. {{quem}} é o título do aviso e {{detalhes}} o texto.", subject: "{{quem}} · Komyx", title: "{{quem}}", intro: "{{detalhes}}", button: "Abrir o Komyx", outro: "Você recebe este e-mail por ser responsável pelo {{buffet}} no Komyx." },
};

export const SAMPLE_VARS: TemplateVars = { buffet: "Festa & Cia Buffet", quem: "Ana Souza", detalhes: "Aniversário · 12/12/2026 · 80 convidados", link: "https://komyx.com.br/notificacoes" };

export function isTemplateKey(key: string): key is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(key);
}

/** Replaces {{buffet}}, {{quem}}, {{detalhes}}, {{link}}. An empty value also drops its " · " separator. */
export function fill(text: string, vars: TemplateVars) {
  let out = text;
  for (const k of ["buffet", "quem", "detalhes", "link"] as const) {
    const v = (vars[k] ?? "").trim();
    if (!v) out = out.replace(new RegExp(`\\s*·\\s*\\{\\{${k}\\}\\}`, "g"), "").replace(new RegExp(`\\{\\{${k}\\}\\}\\s*·\\s*`, "g"), "");
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

/** Subject + branded HTML/text for a template's copy. The button points at vars.link. */
export function renderCopy(copy: TemplateCopy, vars: TemplateVars, extra: { rows?: EmailRow[]; aside?: EmailAside } = {}) {
  const { html, text } = buttonEmail({ title: fill(copy.title, vars), intro: fill(copy.intro, vars), button: fill(copy.button, vars), url: vars.link, outro: fill(copy.outro, vars), ...extra });
  return { subject: fill(copy.subject, vars), html, text };
}
