import { test, expect } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

/** Landing header: "Entrar" for visitors, avatar with a menu to the panel when signed in. */
test.describe("Landing · conta no topo", () => {
  test("visitante vê Entrar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    await expect(page.getByRole("button", { name: "Minha conta" })).toHaveCount(0);
  });

  test("dono logado vê o avatar e abre o painel", async ({ page }) => {
    await login(page, ACCOUNTS.owner);
    await page.goto("/");
    await page.getByRole("button", { name: "Minha conta" }).click();
    await expect(page.getByRole("menuitem", { name: "Abrir o admin" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Abrir o painel" }).click();
    await page.waitForURL(/\/home/);
  });

  test("admin logado vê o A e o atalho do admin", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await page.goto("/");
    const avatar = page.getByRole("button", { name: "Minha conta" });
    await expect(avatar).toHaveText("A");
    await avatar.click();
    await page.getByRole("menuitem", { name: "Abrir o admin" }).click();
    await page.waitForURL(/\/admin/);
  });
});
