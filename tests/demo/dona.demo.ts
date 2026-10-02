import { expect } from "@playwright/test";
import { test, caption, clearCaption, installCaptions, saveVideo, spotlight } from "./caption";
import {ACCOUNTS, DEMO_SLUG, brDate, cleanupCustomerByPhone, pickFreeDate, uniq, uniquePhone } from "../e2e/helpers";

test.describe("Vídeo · Dona do buffet", () => {
  const phone = uniquePhone();
  const customerName = uniq("Carla Demo");
  let date = "";

  test.beforeAll(async () => { date = await pickFreeDate(DEMO_SLUG, 45); });
  test.afterAll(async () => { await cleanupCustomerByPhone(DEMO_SLUG, phone); });

  test("da reserva ao contrato", async ({ page }, testInfo) => {
    await installCaptions(page);
    await page.goto("/login");
    await caption(page, "Dona do buffet entra no Komyx com e-mail e senha");
    await page.getByLabel("E-mail").fill(ACCOUNTS.owner.email);
    await page.getByLabel("Senha").fill(ACCOUNTS.owner.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/home/);
    await caption(page, "Início: o que exige atenção hoje — reservas online, reservas expirando, orçamentos pendentes, a receber", 3500);

    await page.goto("/agenda?view=month");
    await caption(page, "Agenda por mês, semana ou lista. Dias riscados têm festa: o buffet faz um evento por dia", 3500);

    await page.goto("/eventos/novo");
    await caption(page, "Novo orçamento: os mesmos 5 passos que o cliente vê na página pública");
    await caption(page, "1. Pacote: escolher preenche adultos e crianças inclusos");
    await page.getByRole("button", { name: /Pacote Prata/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await caption(page, "2. Data: o calendário risca os dias que já têm festa");
    const [y, m] = date.split("-").map(Number);
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const target = `${months[m - 1]} de ${y}`;
    for (let i = 0; i < 4; i++) {
      if ((await page.getByText(target, { exact: true }).count()) > 0) break;
      await page.getByRole("button", { name: "Próximo mês" }).click();
      await page.waitForTimeout(800);
    }
    const dayBtn = page.getByRole("button", { name: brDate(date), exact: true });
    await spotlight(page, dayBtn);
    await dayBtn.click();
    await page.getByLabel("Início").fill("14:00");
    await page.getByLabel("Fim").fill("18:00");
    await page.getByRole("button", { name: "Continuar" }).click();
    await caption(page, "3. Pessoas: passou do incluso? O extra aparece com valor na hora");
    await page.getByLabel("Adultos", { exact: true }).fill("35");
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Continuar" }).click();
    await caption(page, "4. Cliente: digite o nome; conhecido aparece para escolher, novo é criado sozinho");
    await page.getByLabel("Nome do responsável").fill(customerName);
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone);
    await page.getByLabel("Aniversariante", { exact: true }).fill("Lua");
    await page.getByLabel("Idade").fill("5");
    await page.getByRole("button", { name: "Continuar" }).click();
    await caption(page, "5. Revisão: valor do orçamento e a decisão de reservar a data ou não", 3000);
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.waitForURL(/\/eventos\/[0-9a-f-]+\?created=/);
    const eventUrl = page.url().split("?")[0];
    await caption(page, "Ficha única do evento: status, cliente, orçamento, contrato, convite, convidados, pagamentos", 3500);

    await caption(page, "Abrir o orçamento: já veio pronto com pacote e participantes");
    await page.getByRole("link", { name: "Abrir" }).first().click();
    await page.waitForURL(/\/orcamento\?quote=/);
    await caption(page, "Itens, extras e o plano de pagamento em % já vêm prontos", 3000);
    await caption(page, "Adicionais do catálogo entram com um clique");
    const addon = page.locator("form", { hasText: "Bolo cenográfico" }).getByRole("button", { name: "Adicionar" });
    await spotlight(page, addon);
    await addon.click();
    await page.waitForTimeout(1200);
    await caption(page, "Marcar como enviado gera link e PDF para mandar no WhatsApp");
    await page.getByRole("button", { name: "Marcar como enviado" }).click();
    await page.waitForTimeout(1500);
    await caption(page, "Cliente aceitou: o mesmo registro vira evento confirmado, sem duplicar nada");
    await page.getByRole("button", { name: "Cliente aceitou" }).click();
    await expect(page.getByText("Aceito", { exact: true }).first()).toBeVisible();
    await page.waitForTimeout(1200);

    await caption(page, "Contrato gerado sozinho no aceite: modelo do buffet preenchido com cliente, evento, itens e parcelas");
    await page.goto(eventUrl);
    await page.locator('a[href*="/contrato?c="]').first().click();
    await page.waitForURL(/\/contrato\?c=/);
    await caption(page, "Texto editável, PDF e link para o cliente aceitar online", 3500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(2000);

    await page.goto(eventUrl);
    await caption(page, "Registrar pagamento: o saldo atualiza na hora");
    await page.getByLabel("Valor (R$)").fill("1000");
    await page.getByLabel("Valor (R$)").locator("xpath=ancestor::form").getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("Pagamento registrado.")).toBeVisible();
    await page.waitForTimeout(1500);
    await caption(page, "Link de convidados e portaria para o dia da festa");
    await page.waitForTimeout(1500);
    await page.waitForTimeout(1500);

    await page.goto("/aniversariantes");
    await caption(page, "Aniversariantes: lembrete com promoção pronta para o ano que vem", 3000);
    await clearCaption(page);
    await saveVideo(page, testInfo, "01-dona-do-buffet");
  });
});
