import { expect } from "@playwright/test";
import { test, caption, clearCaption, installCaptions, saveVideo, spotlight } from "./caption";
import { ACCOUNTS, cleanupOrgBySlug, login, logout, uniq } from "../e2e/helpers";

test.describe("Vídeo · Admin Komyx", () => {
  const slug = uniq("demo-buffet");
  const ownerEmail = `${slug}@demo.test`;

  test.afterAll(async () => { await cleanupOrgBySlug(slug); });

  test("gerenciar buffets da plataforma", async ({ page }, testInfo) => {
    await installCaptions(page);
    await page.goto("/login");
    await caption(page, "Admin do Komyx entra com uma conta marcada como administrador da plataforma");
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin");
    await caption(page, "Visão geral: buffets ativos, eventos e reservas online, leads e pagamentos", 3500);

    await page.goto("/admin/buffets");
    await caption(page, "Lista de buffets com responsável, plano, eventos e pagamentos", 3000);

    await page.goto("/admin/buffets/novo");
    await caption(page, "Novo buffet: cria a empresa e o acesso do responsável de uma vez");
    await page.getByLabel("Nome do buffet").fill("Buffet Demonstração");
    await page.getByLabel("Slug (opcional)").fill(slug);
    await page.getByLabel("Plano").selectOption("premium");
    await page.getByLabel("Nome", { exact: true }).fill("Patrícia Demo");
    await page.getByLabel("E-mail").fill(ownerEmail);
    await page.getByLabel("Senha inicial").fill("senha12345");
    await page.getByRole("button", { name: "Criar buffet e acesso" }).click();
    await page.waitForURL(/\/admin\/buffets\/[0-9a-f-]+\?created=1/);
    const detailUrl = page.url().split("?")[0];
    await caption(page, "Página do buffet: plano, status, slug, notas internas, pessoas e eventos", 3500);

    await caption(page, "Suspender pausa o acesso e a página pública; os dados ficam guardados");
    const status = page.getByLabel("Status");
    await spotlight(page, status);
    await status.selectOption("suspended");
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect(page.getByText("Buffet atualizado.")).toBeVisible();
    await page.waitForTimeout(1200);

    await logout(page);
    await page.goto("/login");
    await caption(page, "Dona do buffet suspenso tenta entrar…");
    await login(page, { email: ownerEmail, password: "senha12345" }).catch(() => null);
    await page.goto("/home");
    await page.waitForURL(/\/suspenso/);
    await caption(page, "…e vê a conta suspensa com contato do suporte", 3000);

    await logout(page);
    await login(page, ACCOUNTS.admin);
    await page.goto(detailUrl);
    await caption(page, "Reativar devolve o acesso na hora");
    await page.getByLabel("Status").selectOption("active");
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect(page.getByText("Buffet atualizado.")).toBeVisible();
    await page.waitForTimeout(1000);
    await caption(page, "Redefinir senha e trocar papel owner/equipe também ficam aqui", 2500);

    await logout(page);
    await login(page, { email: ownerEmail, password: "senha12345" });
    await caption(page, "A nova dona entra e encontra o checklist para deixar o buffet pronto para vender", 3500);
    await page.goto("/configuracoes/empresa");
    await caption(page, "O endereço público é fixo para a dona: só o Komyx altera", 3000);
    await clearCaption(page);
    await saveVideo(page, testInfo, "03-admin-komyx");
  });
});
