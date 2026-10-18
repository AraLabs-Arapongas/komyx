import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadMenuGroups } from "@/lib/data/menu";
import { groupsForPackage, menuSummaryLines, menuView, type MenuPick } from "@/lib/menu";
import { formatCurrency, formatPhone, whatsappLink, appUrl } from "@/lib/utils";
import { occasionLabel } from "@/lib/labels";
import { APP_STORE_URL } from "@/lib/app-links";
import { renderTemplate } from "./templates";
import { sendLoggedEmail } from "./message-log";
import type { EmailRow } from "./layout";

export type ClientSummaryInput = {
  to: string;
  org: { id: string; name: string; slug: string; whatsapp: string | null; showPrices: boolean };
  name: string;
  whatsapp: string;
  pkg: { id: string; name: string } | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  adults: number | null;
  children: number | null;
  themeId: string | null;
  picks: MenuPick[];
  addons: { name: string; quantity: number }[];
  occasion: string | null;
  celebrant: string | null;
  message: string | null;
  estimatedTotal: number | null;
  // Present when the client reserved the date (self-service booking).
  reservation?: { url: string; expiresAt: string; deposit: number | null };
};

const brDate = (key: string) => key.split("-").reverse().join("/");

/**
 * E-mail to the client who left an address on the public quote: everything they chose, their contact
 * data, how to reach the buffet (or their reservation link) and the Komyx app. Never throws.
 */
export async function sendClientSummary(d: ClientSummaryInput) {
  try {
    const admin = createAdminClient();
    const [{ data: theme }, groups] = await Promise.all([
      d.themeId ? admin.from("party_themes").select("name").eq("id", d.themeId).maybeSingle() : Promise.resolve({ data: null }),
      d.pkg ? loadMenuGroups(admin, { orgId: d.org.id, packageIds: [d.pkg.id] }) : Promise.resolve([]),
    ]);

    const rows: EmailRow[] = [];
    rows.push(["Pacote", d.pkg ? d.pkg.name : "Personalizado (o buffet monta com você)"]);
    rows.push(["Data", d.date ? `${brDate(d.date)}${d.time ? ` às ${d.time}` : ""}` : "A combinar"]);
    if (d.adults != null || d.children != null) rows.push(["Pessoas", `${d.adults ?? 0} adultos · ${d.children ?? 0} crianças`]);
    if (d.occasion) rows.push(["Ocasião", occasionLabel(d.occasion)]);
    if (d.celebrant) rows.push(["Aniversariante", d.celebrant]);
    if (theme?.name) rows.push(["Tema", theme.name]);
    const pkgGroups = d.pkg ? groupsForPackage(groups, d.pkg.id) : [];
    if (pkgGroups.length) {
      const lines = menuSummaryLines(menuView(pkgGroups, d.picks.flatMap((p) => p.item_ids)));
      rows.push(["Cardápio", lines.map((l) => `${l.name}: ${l.text}`).join("\n")]);
    }
    rows.push(["Adicionais", d.addons.length ? d.addons.map((a) => `${a.name} × ${a.quantity}`).join(", ") : "Nenhum"]);
    if (d.message) rows.push(["Observações", d.message]);
    rows.push(["Seus dados", `${d.name} · ${formatPhone(d.whatsapp)} · ${d.to}`]);
    if (d.org.showPrices && d.estimatedTotal != null) rows.push([d.reservation ? "Total" : "Estimativa", formatCurrency(d.estimatedTotal)]);
    if (d.reservation?.deposit != null) rows.push(["Sinal por Pix", formatCurrency(d.reservation.deposit)]);
    if (d.org.whatsapp) rows.push([`WhatsApp do ${d.org.name}`, formatPhone(d.org.whatsapp)]);

    const first = d.name.trim().split(/\s+/)[0];
    const deadline = d.reservation ? new Date(d.reservation.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
    const link = d.reservation
      ? d.reservation.url
      : d.org.whatsapp
        ? whatsappLink(d.org.whatsapp, `Olá! Sou ${d.name} e acabei de pedir um orçamento pela página${d.date ? ` para ${brDate(d.date)}` : ""}.`)
        : appUrl(`/p/${d.org.slug}`);

    const { subject, html, text } = await renderTemplate(d.reservation ? "client_summary_reservation" : "client_summary_request", {
      buffet: d.org.name,
      quem: first,
      detalhes: d.reservation ? `Pague o sinal por Pix até ${deadline} para confirmar a festa.` : "",
      link,
    }, {
      rows,
      aside: {
        title: "Acompanhe sua festa pelo app Komyx",
        text: "Orçamento, contrato, Pix, convidados e convite no celular. Entre com o seu WhatsApp. Para iPhone; no Android, use o link da reserva.",
        button: "Baixar na App Store",
        url: APP_STORE_URL,
      },
    });
    await sendLoggedEmail({ to: d.to, subject, html, text }, { kind: "client_summary", organizationId: d.org.id });
  } catch (e) {
    console.error("[client-summary]", e);
  }
}
