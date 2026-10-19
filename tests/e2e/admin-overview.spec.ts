import { test, expect } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

/** Admin › Visão geral: business health (money, customers, 12 months) before product usage. */
test("visão geral mostra a saúde do negócio e os buffets atrasados", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await page.goto("/admin");
  for (const t of ["Dinheiro da Komyx", "Clientes", "Uso do produto"]) await expect(page.getByRole("heading", { name: t })).toBeVisible();
  for (const t of ["Receita recorrente (MRR)", "Recebido no mês", "A receber (30 dias)", "Em atraso", "Buffets pagantes", "Em teste grátis", "Conversão do teste (90 dias)", "Cancelamentos no mês", "Recebido pelos buffets"]) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Receita recebida por mês nos últimos 12 meses" })).toBeVisible();
  // The seed's late buffets are listed by name with a link to their billing tab.
  await expect(page.getByRole("link", { name: /Buffet Pausado: acesso pausado/ })).toHaveAttribute("href", /\/admin\/buffets\/.+\?aba=plano/);
});
