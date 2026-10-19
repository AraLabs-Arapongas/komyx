import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login } from "./helpers";

/** Configurações › Empresa: an invalid CPF/CNPJ shows its error under the field and keeps what was typed. */
test("CPF/CNPJ: máscara, erro no campo e o valor digitado continua lá", async ({ page }) => {
  await login(page, ACCOUNTS.owner);
  await page.goto("/configuracoes/empresa");
  const doc = page.getByLabel("CNPJ / CPF");
  const before = await doc.inputValue();
  // Digits only, masked as typed (letters and punctuation are dropped).
  await doc.fill("");
  await doc.pressSequentially("12a345/678.0001-90");
  await expect(doc).toHaveValue("12.345.678/0001-90");
  await page.getByRole("button", { name: "Salvar alterações" }).first().click();
  await expect(page.getByText("CPF ou CNPJ inválido: confira os números.")).toBeVisible();
  await expect(doc).toHaveValue("12.345.678/0001-90");
  // A CPF gets the CPF mask.
  await doc.fill("");
  await doc.pressSequentially("41634499905");
  await expect(doc).toHaveValue("416.344.999-05");
  const { data } = await adminDb().from("organizations").select("document").eq("slug", "festa-cia-buffet").single();
  // Nothing saved: same digits as before.
  expect((data?.document ?? "").replace(/\D/g, "")).toBe(before.replace(/\D/g, ""));
});

test("Descartar volta o CPF/CNPJ e o WhatsApp ao valor salvo", async ({ page }) => {
  await login(page, ACCOUNTS.owner);
  await page.goto("/configuracoes/empresa");
  const doc = page.getByLabel("CNPJ / CPF");
  const phone = page.getByLabel("WhatsApp");
  const [docBefore, phoneBefore] = [await doc.inputValue(), await phone.inputValue()];
  await doc.fill("");
  await doc.pressSequentially("12345678000190");
  await phone.fill("");
  await phone.pressSequentially("11911112222");
  await page.getByRole("button", { name: "Descartar", exact: true }).click();
  await expect(doc).toHaveValue(docBefore);
  await expect(phone).toHaveValue(phoneBefore);
});
