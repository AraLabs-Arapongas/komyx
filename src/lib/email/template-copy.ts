import { buttonEmail, type EmailAside, type EmailRow } from "./layout";

// No "server-only": shared by the senders and the admin editor's live preview.

export const TEMPLATE_KEYS = ["request", "reservation", "contract_accepted", "client_request", "other", "password_reset", "announcement", "client_summary_request", "client_summary_reservation", "welcome_owner", "password_set_by_admin", "billing_overdue", "billing_last_warning", "billing_paused"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateCopy = { subject: string; title: string; intro: string; button: string; outro: string };
// vencimento / prazo / whatsapp: the Komyx late notices (billing_*).
export type TemplateVars = { buffet?: string; quem?: string; detalhes?: string; vencimento?: string; prazo?: string; whatsapp?: string; link: string };
const VAR_NAMES = ["buffet", "quem", "detalhes", "vencimento", "prazo", "whatsapp", "link"] as const;

const BILLING_HELP = "Precisa de ajuda? Fale com a gente pelo WhatsApp {{whatsapp}} ou contato@komyx.com.br.";
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
  welcome_owner: { name: "Boas-vindas ao dono", description: "Quando a Komyx cria um buffet pelo admin. {{quem}} é o primeiro nome do responsável; o botão leva para criar a senha.", subject: "Seu acesso ao Komyx · {{buffet}}", title: "Bem-vindo ao Komyx", intro: "Oi, {{quem}}! O {{buffet}} já está no Komyx. Toque no botão para criar sua senha e entrar.", button: "Criar minha senha", outro: "O link vale por 1 hora. Se expirar, use \"Esqueci minha senha\" na tela de entrada." },
  password_set_by_admin: { name: "Senha provisória pelo suporte", description: "Quando o admin redefine a senha de alguém. Não contém a senha: avisa e pede para criar uma nova no próximo acesso.", subject: "Sua senha do Komyx foi redefinida", title: "Sua senha foi redefinida", intro: "Oi, {{quem}}! O suporte da Komyx definiu uma senha provisória para sua conta do {{buffet}}. Ao entrar com ela, você vai criar a sua senha.", button: "Entrar no Komyx", outro: "Se você não pediu isso, responda este e-mail ou fale com a gente pelo WhatsApp." },
  billing_overdue: { name: "Mensalidade vencida (dias 1 e 5)", description: "Para o dono quando a mensalidade do Komyx venceu e não foi paga. {{vencimento}} é o vencimento e {{prazo}} o último dia antes de pausar.", subject: "Sua mensalidade do Komyx venceu · {{buffet}}", title: "Sua mensalidade venceu", intro: "Sua mensalidade venceu em {{vencimento}}. Pague até {{prazo}} para não pausar o acesso do {{buffet}}.", button: "Pagar agora", outro: BILLING_HELP },
  billing_last_warning: { name: "Último aviso antes de pausar (dia 9)", description: "Para o dono no 9º dia de atraso. {{vencimento}} é o vencimento.", subject: "Amanhã seu acesso ao Komyx será pausado · {{buffet}}", title: "Amanhã seu acesso será pausado", intro: "A mensalidade que venceu em {{vencimento}} continua em aberto. Pague hoje para o {{buffet}} continuar usando o Komyx sem interrupção.", button: "Pagar agora", outro: BILLING_HELP },
  billing_paused: { name: "Acesso pausado (dia 10)", description: "Para o dono quando o acesso é pausado por falta de pagamento. A página pública continua no ar.", subject: "Seu acesso ao Komyx está pausado · {{buffet}}", title: "Seu acesso está pausado", intro: "A mensalidade que venceu em {{vencimento}} não foi paga e o acesso do {{buffet}} ao Komyx foi pausado. Sua página pública continua no ar recebendo pedidos. Assim que o pagamento for confirmado, tudo volta sozinho.", button: "Pagar e voltar a usar", outro: BILLING_HELP },
  announcement: { name: "Aviso da Komyx", description: "Avisos da plataforma enviados por e-mail aos donos dos buffets. {{quem}} é o título do aviso e {{detalhes}} o texto.", subject: "{{quem}} · Komyx", title: "{{quem}}", intro: "{{detalhes}}", button: "Abrir o Komyx", outro: "Você recebe este e-mail por ser responsável pelo {{buffet}} no Komyx." },
};

export const SAMPLE_VARS: TemplateVars = { buffet: "Festa & Cia Buffet", quem: "Ana Souza", detalhes: "Aniversário · 12/12/2026 · 80 convidados", vencimento: "07/11/2026", prazo: "16/11/2026", whatsapp: "(11) 99999-9999", link: "https://komyx.com.br/notificacoes" };

export function isTemplateKey(key: string): key is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(key);
}

/** Replaces {{buffet}}, {{quem}}, {{detalhes}}, {{link}} (and the billing vars). An empty value also drops its " · " separator. */
export function fill(text: string, vars: TemplateVars) {
  let out = text;
  for (const k of VAR_NAMES) {
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
