import { buildPixPayload } from "@/lib/pix";
import { formatCurrency, formatDate } from "@/lib/utils";

/** Reservation code used as the Pix identifier (EMV 62-05). Same formula as the online reservation. */
export function eventTxid(event: { id: string; pix_txid?: string | null }) {
  return event.pix_txid ?? `FESTA${event.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

export type OpenItem = { label: string; amount: number };

/** Pix "copia e cola" for an outstanding amount, or null when the buffet has no Pix key. */
export function balancePix(org: { pix_key: string | null; legal_name?: string | null; name: string; city?: string | null }, event: { id: string; pix_txid?: string | null }, amount: number) {
  if (!org.pix_key || !(amount > 0)) return null;
  return buildPixPayload({ key: org.pix_key, merchantName: org.legal_name || org.name, merchantCity: (org.city || "SAO PAULO").split("/")[0], amount: Math.round(amount * 100) / 100, txid: eventTxid(event), description: `${eventTxid(event)} saldo festa` });
}

/** WhatsApp text to collect what is still open after (or before) the party. */
export function chargeMessage(opts: { firstName: string; orgName: string; eventTitle: string; eventDate: string; items: OpenItem[]; total: number; pixKey: string | null; pixPayload: string | null; txid: string; link: string | null }) {
  const lines = [
    `Oi, ${opts.firstName}! Tudo bem?`,
    "",
    `Segue o que ficou em aberto da ${opts.eventTitle} (${formatDate(opts.eventDate)}):`,
    ...opts.items.map((i) => `• ${i.label}: ${formatCurrency(i.amount)}`),
    `Total: ${formatCurrency(opts.total)}`,
  ];
  if (opts.pixKey) {
    lines.push("", `Pix para ${opts.orgName}`, `Chave: ${opts.pixKey}`, `Identificador: ${opts.txid}`);
    if (opts.pixPayload) lines.push("", "Pix copia e cola (valor exato):", opts.pixPayload);
  }
  if (opts.link) lines.push("", "Detalhes e Pix também aqui:", opts.link);
  lines.push("", `Qualquer dúvida, estou à disposição. ${opts.orgName}`);
  return lines.join("\n");
}
