import { expect } from "@playwright/test";
import { test, caption, clearCaption, installCaptions, saveVideo, spotlight } from "./caption";
import { ACCOUNTS, DEMO_SLUG, cleanupCustomerByPhone, login, pickFreeDate, uniq, uniquePhone } from "../e2e/helpers";

test.describe("Vídeo · Dona do buffet", () => {
  const phone = uniquePhone();
  const customerName = uniq("Carla Demo");
  let date = "";

  test.beforeAll(async () => { date = await pickFreeDate(DEMO_SLUG, 45); });
  test.afterAll(async () => { await cleanupCustomerByPhone(DEMO_SLUG, phone); });

  test("da reserva ao contrato", async ({ page }, testInfo) => {
    await installCaptions(page);
    await page.goto("/login");
    await caption(page, "Dona do buffet entra no Festeja com e-mail e senha");
    await page.getByLabel("E-mail").fill(ACCOUNTS.owner.email);
    await page.getByLabel("Senha").fill(ACCOUNTS.owner.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/home/);
    await caption(page, "Início: o que exige atenção hoje — reservas online, reservas expirando, orçamentos pendentes, a receber", 3500);

    await page.goto("/agenda?view=month");
    await caption(page, "Agenda por mês, semana ou lista. Dias riscados têm festa: o buffet faz um evento por dia", 3500);

    await page.goto("/eventos/novo");
    await caption(page, "Novo orçamento em menos de um minuto: cliente, WhatsApp, data e horário");
    await page.getByLabel("Nome do responsável").fill(customerName);
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone);
    await page.getByLabel("Data", { exact: true }).fill(date);
    await page.getByLabel("Início").fill("14:00");
    await page.getByLabel("Fim").fill("18:00");
    await caption(page, "Escolher o pacote preenche adultos e crianças inclusos");
    const pkgSelect = page.getByLabel("Pacote", { exact: true });
    await spotlight(page, pkgSelect);
    await pkgSelect.selectOption((await pkgSelect.locator("option", { hasText: "Pacote Prata" }).getAttribute("value"))!);
    await page.waitForTimeout(800);
    await caption(page, "Passou do incluso? O sistema mostra o extra e o valor na hora");
    await page.getByLabel("Adultos", { exact: true }).fill("35");
    await page.waitForTimeout(1500);
    await page.getByLabel("Aniversariante", { exact: true }).fill("Lua");
    await page.getByLabel("Idade").fill("5");
    await caption(page, "Reservar a data? Sim: a data fica bloqueada até o prazo configurado. O orçamento já nasce junto");
    await page.getByRole("button", { name: "Criar orçamento" }).click();
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

    await caption(page, "Gerar contrato: modelo do buffet preenchido com cliente, evento, itens e parcelas");
    await page.getByRole("button", { name: "Gerar contrato" }).first().click();
    await page.waitForURL(/\/contrato\?c=/);
    await caption(page, "Texto editável, PDF e link para o cliente aceitar online", 3500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(2000);

    await page.goto(eventUrl);
    await caption(page, "Registrar pagamento: o saldo atualiza na hora");
    await page.getByLabel("Valor (R$)").fill("1000");
    await page.getByRole("button", { name: "Adicionar pagamento" }).click();
    await expect(page.getByText("Pagamento registrado.")).toBeVisible();
    await page.waitForTimeout(1500);
    await caption(page, "Link de convidados e portaria para o dia da festa");
    await page.getByRole("button", { name: "Gerar link", exact: true }).click();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Gerar link da portaria" }).click();
    await page.waitForTimeout(1500);

    await page.goto("/aniversariantes");
    await caption(page, "Aniversariantes: lembrete com promoção pronta para o ano que vem", 3000);
    await clearCaption(page);
    await saveVideo(page, testInfo, "01-dona-do-buffet");
  });
});
