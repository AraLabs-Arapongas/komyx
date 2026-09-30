import { formatCurrency, formatDate, formatTime } from "@/lib/utils";

export type ContractData = {
  org: { name: string; legal_name: string | null; document: string | null; address: string | null; whatsapp: string | null; city: string | null; pix_key: string | null };
  customer: { name: string; document: string | null; whatsapp: string; email: string | null };
  event: { title: string; starts_at: string; ends_at: string; adults: number | null; children: number | null; celebrant_name: string | null };
  packageName: string | null;
  items: { description: string; quantity: number | string; unit_price: number | string; total: number | string | null }[];
  total: number | string;
  installments: { label: string; percent: number | string; amount: number | string; rule: string; days_before: number | null; due_date: string | null }[];
};

export function installmentDueLabel(i: { rule: string; days_before: number | null; due_date: string | null }, eventStartsAt: string, acceptedAt?: string | null) {
  if (i.rule === "ON_ACCEPT") return acceptedAt ? `em ${formatDate(acceptedAt)} (aceite)` : "na aceitação do orçamento";
  if (i.rule === "FIXED_DATE" && i.due_date) return `até ${i.due_date.split("-").reverse().join("/")}`;
  const days = i.days_before ?? 0;
  const due = new Date(new Date(eventStartsAt).getTime() - days * 86_400_000);
  return days === 0 ? `no dia da festa (${formatDate(due)})` : `até ${formatDate(due)} (${days} dia${days === 1 ? "" : "s"} antes)`;
}

/** Replaces {{placeholders}} in the organization template with event data. */
export function renderContract(template: string, d: ContractData) {
  const participants = [d.event.adults ? `${d.event.adults} adultos` : null, d.event.children ? `${d.event.children} crianças` : null].filter(Boolean).join(" e ") || "a combinar";
  const items = d.items.length
    ? d.items.map((it) => `- ${it.description} — ${Number(it.quantity)} × ${formatCurrency(it.unit_price)} = ${formatCurrency(it.total)}`).join("\n")
    : "- Conforme orçamento aprovado.";
  const plan = d.installments.length
    ? d.installments.map((i, idx) => `${idx + 1}) ${i.label}: ${formatCurrency(i.amount)} (${Number(i.percent)}%), ${installmentDueLabel(i, d.event.starts_at)}.`).join("\n")
    : "Conforme combinado entre as partes.";
  const vars: Record<string, string> = {
    buffet_nome: d.org.name,
    buffet_razao: d.org.legal_name || d.org.name,
    buffet_documento: d.org.document || "documento não informado",
    buffet_endereco: d.org.address || "endereço não informado",
    buffet_whatsapp: d.org.whatsapp || "—",
    buffet_cidade: d.org.city || "—",
    cliente_nome: d.customer.name,
    cliente_documento: d.customer.document || "documento não informado",
    cliente_whatsapp: d.customer.whatsapp,
    cliente_email: d.customer.email ? `, e-mail ${d.customer.email}` : "",
    evento_titulo: d.event.title,
    evento_data: formatDate(d.event.starts_at),
    evento_inicio: formatTime(d.event.starts_at),
    evento_fim: formatTime(d.event.ends_at),
    evento_participantes: participants,
    aniversariante: d.event.celebrant_name || "—",
    pacote: d.packageName || "personalizado",
    itens: items,
    valor_total: formatCurrency(d.total),
    plano_pagamento: plan,
    pix: d.org.pix_key ? `Chave Pix: ${d.org.pix_key}` : "",
    data_geracao: formatDate(new Date(), { day: "2-digit", month: "long", year: "numeric" }),
  };
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => (key in vars ? vars[key] : `{{${key}}}`));
}

export const CONTRACT_PLACEHOLDERS = [
  "buffet_nome", "buffet_razao", "buffet_documento", "buffet_endereco", "buffet_whatsapp", "buffet_cidade",
  "cliente_nome", "cliente_documento", "cliente_whatsapp", "cliente_email",
  "evento_titulo", "evento_data", "evento_inicio", "evento_fim", "evento_participantes", "aniversariante",
  "pacote", "itens", "valor_total", "plano_pagamento", "pix", "data_geracao",
];
