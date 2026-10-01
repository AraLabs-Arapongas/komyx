import { test, expect } from "@playwright/test";
import { ACCOUNTS, DEMO_SLUG, brDate, cleanupCustomerByPhone, login, pickFreeDate, uniq, uniquePhone } from "./helpers";

/**
 * Dona do buffet: reserva → orçamento → contrato → pagamento → confirmação.
 * Everything created here is removed in afterAll.
 */
test.describe("Dona do buffet", () => {
  const phone = uniquePhone();
  const customerName = uniq("Cliente E2E");
  let date = "";

  test.beforeAll(async () => {
    date = await pickFreeDate(DEMO_SLUG, 45);
  });

  test.afterAll(async () => {
    await cleanupCustomerByPhone(DEMO_SLUG, phone);
  });

  test("fluxo completo de venda", async ({ page }) => {
    await login(page, ACCOUNTS.owner);

    // Home shows onboarding or operational cards
    await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();

    // Novo orçamento
    // Novo orçamento: wizard de 5 passos (igual ao público)
    await page.goto("/eventos/novo");
    await page.getByRole("button", { name: /Pacote Prata/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    const [y, m] = date.split("-").map(Number);
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const target = `${months[m - 1]} de ${y}`;
    for (let i = 0; i < 4; i++) {
      if ((await page.getByText(target, { exact: true }).count()) > 0) break;
      await page.getByRole("button", { name: "Próximo mês" }).click();
    }
    await page.getByRole("button", { name: brDate(date), exact: true }).click();
    await page.getByLabel("Início").fill("14:00");
    await page.getByLabel("Fim").fill("18:00");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByLabel("Adultos", { exact: true })).toHaveValue("30");
    await page.getByLabel("Adultos", { exact: true }).fill("35"); // 5 extra adults
    await expect(page.getByText(/Extras além do pacote/)).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Nome do responsável").fill(customerName);
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone);
    await page.getByLabel("Aniversariante", { exact: true }).fill("Lua");
    await page.getByLabel("Idade").fill("5");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Confira e salve")).toBeVisible();
    await expect(page.getByText("R$ 4.225,00").first()).toBeVisible(); // 3900 + 5*65
    await page.getByRole("button", { name: "Salvar" }).click();
    await page.waitForURL(/\/eventos\/[0-9a-f-]+\?created=PRE_RESERVED/);
    await expect(page.getByText(/Orçamento criado e data reservada/)).toBeVisible();
    await expect(page.getByText("35 adultos · 30 crianças")).toBeVisible();
    const eventUrl = page.url().split("?")[0];

    // Orçamento já nasce com o evento, a partir do pacote + extras
    await page.getByRole("link", { name: "Abrir" }).first().click();
    await page.waitForURL(/\/orcamento\?quote=/);
    await expect(page.getByText("Pacote Prata", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Adultos adicionais (5)")).toBeVisible();
    await expect(page.getByText("R$ 4.225,00").first()).toBeVisible(); // 3900 + 5*65
    await expect(page.getByText("Sinal na aceitação")).toBeVisible();

    // Adicional do catálogo
    await page.locator("form", { hasText: "Bolo cenográfico" }).getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("R$ 4.405,00").first()).toBeVisible();

    // Enviar e aceitar => confirma o evento
    await page.getByRole("button", { name: "Marcar como enviado" }).click();
    await expect(page.getByText("Copiar link")).toBeVisible();
    await page.getByRole("button", { name: "Cliente aceitou" }).click();
    await expect(page.getByText("Aceito", { exact: true }).first()).toBeVisible();

    // PDF do orçamento responde
    const pdf = await page.request.get(page.url().replace("/orcamento?quote=", "/orcamento/pdf?quote="));
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");

    // Contrato gerado e preenchido
    await page.getByRole("button", { name: "Gerar contrato" }).first().click();
    await page.waitForURL(/\/contrato\?c=/);
    const content = (await page.locator("textarea[name=content]").inputValue()).replace(/\u00a0/g, " ");
    expect(content).toContain(customerName);
    expect(content).toContain(brDate(date));
    expect(content).toContain("R$ 4.405,00");
    expect(content).not.toContain("{{");
    await page.getByRole("button", { name: "Marcar como enviado" }).click();
    await expect(page.getByText("Enviado", { exact: true }).first()).toBeVisible();

    // Pagamento e status
    await page.goto(eventUrl);
    await expect(page.getByText("Confirmado", { exact: true }).first()).toBeVisible();
    await page.getByLabel("Valor (R$)").fill("1000");
    await page.getByLabel("Valor (R$)").locator("xpath=ancestor::form").getByRole("button", { name: "Adicionar" }).click();
    await expect(page.getByText("Pagamento registrado.")).toBeVisible();
    await expect(page.getByText("R$ 3.405,00").first()).toBeVisible(); // saldo

    // Convidado manual + link público
    await page.getByLabel("Adicionar convidado").fill("Família Teste");
    await page.getByLabel("Adultos", { exact: true }).last().fill("2");
    await page.getByLabel("Crianças", { exact: true }).last().fill("1");
    await page.getByLabel("Adicionar convidado").locator("xpath=ancestor::form").getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByText("Família Teste")).toBeVisible();
    await page.getByRole("button", { name: "Gerar link", exact: true }).click();
    await expect(page.getByText(/\/o\/[A-Za-z0-9]{8}/)).toBeVisible();

    // Aparece na aba Orçamentos e na lista de aniversariantes
    await page.goto("/orcamentos");
    await expect(page.getByText(customerName).first()).toBeVisible();
  });

  test("equipe não acessa configurações", async ({ page }) => {
    await login(page, ACCOUNTS.staff);
    await page.goto("/configuracoes");
    await page.waitForURL(/\/home\?error=forbidden/);
    await expect(page.getByText("Apenas o proprietário")).toBeVisible();
    // Owner-only areas are not offered in the sidebar for staff
    const aside = page.locator("aside");
    await expect(aside.getByRole("link", { name: "Configurações" })).toHaveCount(0);
    await expect(aside.getByRole("link", { name: "Pacotes" })).toHaveCount(0);
    await expect(aside.getByRole("link", { name: "Agenda" })).toBeVisible();
  });
});
