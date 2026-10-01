import { expect } from "@playwright/test";
import { test, caption, clearCaption, installCaptions, saveVideo, spotlight } from "./caption";
import { DEMO_SLUG, adminDb, brDate, cleanupCustomerByPhone, pickFreeDate, uniq, uniquePhone } from "../e2e/helpers";

test.describe("Vídeo · Cliente", () => {
  const phone = uniquePhone();
  const name = uniq("Mariana Demo");
  let date = "";

  test.beforeAll(async () => { date = await pickFreeDate(DEMO_SLUG, 50); });
  test.afterAll(async () => { await cleanupCustomerByPhone(DEMO_SLUG, phone); });

  test("do Instagram à reserva paga", async ({ page }, testInfo) => {
    await installCaptions(page);
    await page.goto(`/p/${DEMO_SLUG}?src=instagram`);
    await caption(page, "Cliente chega pelo link da bio do Instagram (a origem fica registrada)", 3000);
    await page.mouse.wheel(0, 700);
    await caption(page, "Fotos reais, destaques e pacotes com o que está incluso", 3000);
    await page.mouse.wheel(0, 700);
    await caption(page, "Como funciona, depoimentos e contato", 2500);
    await page.mouse.wheel(0, -1400);
    await page.waitForTimeout(500);

    await caption(page, "Monte seu orçamento: 5 passos simples");
    await page.getByRole("link", { name: /Monte seu orçamento/ }).first().click();
    await page.waitForURL(/\/orcamento/);
    await caption(page, "1. Escolha o pacote");
    await page.getByRole("button", { name: /Pacote Prata/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await caption(page, "2. Escolha o dia: o calendário mostra os dias já ocupados");
    const [y, m] = date.split("-").map(Number);
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const target = `${months[m - 1]} de ${y}`;
    for (let i = 0; i < 4; i++) {
      if ((await page.getByText(target, { exact: true }).count()) > 0) break;
      await page.getByRole("button", { name: "Próximo mês" }).click();
      await page.waitForTimeout(900);
    }
    const dayBtn = page.getByRole("button", { name: brDate(date), exact: true });
    await spotlight(page, dayBtn);
    await dayBtn.click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Continuar" }).click();

    await caption(page, "3. Quantas pessoas e quais adicionais; o valor muda na hora");
    await page.getByLabel("Adultos", { exact: true }).fill("40");
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: "Mais Hora extra" }).click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Continuar" }).click();

    await caption(page, "4. Seus dados");
    await page.getByLabel("Seu nome", { exact: true }).fill(name);
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone);
    await page.getByLabel("Aniversariante", { exact: true }).fill("Nina");
    await page.getByLabel("Nascimento", { exact: true }).fill("2021-05-05");
    await page.getByRole("button", { name: "Continuar" }).click();

    await caption(page, "5. Revisão: total, sinal em % e o prazo definido pelo buffet", 3500);
    await page.mouse.wheel(0, 300);
    await caption(page, "Reservar esta data: a data fica segura enquanto o sinal é pago");
    const reserve = page.getByRole("button", { name: "Reservar esta data" });
    await spotlight(page, reserve);
    await reserve.click();
    await expect(page.getByText("Data reservada")).toBeVisible({ timeout: 30_000 });
    await caption(page, "Pix com QR code, chave do buffet e código da reserva que aparece no comprovante", 4000);
    await page.mouse.wheel(0, 300);
    await caption(page, "Link permanente da reserva: Pix, orçamento e contrato sempre à mão", 3000);
    const link = await page.getByText(/\/r\/[0-9a-f]{48}/).first().textContent();
    const token = link!.match(/\/r\/([0-9a-f]{48})/)![1];

    await page.goto(`/r/${token}`);
    await caption(page, "Página da reserva: status, prazo, Pix, orçamento em PDF e contrato", 3500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1500);

    await page.goto(`/p/${DEMO_SLUG}`);
    await caption(page, "Voltou à página? O banner lembra a reserva. Perdeu o link? Busca por WhatsApp e data", 3500);
    await page.mouse.wheel(0, 99999);
    await page.getByText("Já reservou? Encontre sua reserva").click();
    const box = page.locator("details", { hasText: "Encontre sua reserva" });
    await box.getByLabel("WhatsApp", { exact: true }).fill(phone);
    await box.getByLabel("Data da festa").fill(date);
    await box.getByRole("button", { name: "Abrir minha reserva" }).click();
    await page.waitForURL(/\/r\/[0-9a-f]{48}/);
    await page.waitForTimeout(1500);

    // Guest RSVP on the same event
    const db = adminDb();
    const { data: customer } = await db.from("customers").select("id").eq("whatsapp", phone).single();
    const { data: ev } = await db.from("events").select("id, organization_id").eq("customer_id", customer!.id).single();
    const { data: guestLink } = await db.from("public_links").insert({ organization_id: ev!.organization_id, event_id: ev!.id, type: "GUEST_CONFIRM" }).select("token").single();
    await page.goto(`/g/${guestLink!.token}`);
    await caption(page, "Convidados recebem o convite e confirmam presença pelo link", 3000);
    await page.getByLabel("Seu nome (ou da família)").fill("Família Souza");
    await page.getByLabel("Adultos", { exact: true }).fill("2");
    await page.getByLabel("Crianças", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(page.getByText("Presença confirmada")).toBeVisible();
    await caption(page, "Presença confirmada e festa salva no calendário", 2500);
    await clearCaption(page);
    await saveVideo(page, testInfo, "02-cliente");
  });
});
