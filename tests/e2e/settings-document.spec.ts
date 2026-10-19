import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login } from "./helpers";

/** Configurações › Empresa: an invalid CPF/CNPJ shows its error under the field and keeps what was typed. */
test("CNPJ inválido: erro no campo e o valor digitado continua lá", async ({ page }) => {
  await login(page, ACCOUNTS.owner);
  await page.goto("/configuracoes/empresa");
  const doc = page.getByLabel("CNPJ / CPF");
  const before = await doc.inputValue();
  await doc.fill("12.345.678/0001-90");
  await page.getByRole("button", { name: "Salvar alterações" }).first().click();
  await expect(page.getByText("CPF ou CNPJ inválido: confira os números.")).toBeVisible();
  await expect(doc).toHaveValue("12.345.678/0001-90");
  const { data } = await adminDb().from("organizations").select("document").eq("slug", "festa-cia-buffet").single();
  expect(data?.document).toBe(before);
});
