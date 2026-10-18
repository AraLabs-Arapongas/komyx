import { test, expect } from "@playwright/test";
import { DEMO_SLUG } from "./helpers";

test.describe("signed-out routing", () => {
  test("unknown path shows the 404 page instead of /login", async ({ page }) => {
    const res = await page.goto("/nao-existe-essa-pagina");
    expect(res?.status()).toBe(404);
    expect(page.url()).not.toContain("/login");
    await expect(page.getByRole("heading", { name: /Essa página não existe/ })).toBeVisible();
  });

  test("private routes still redirect to /login", async ({ page }) => {
    for (const path of ["/home", "/admin", "/eventos"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
    }
  });
});

test("quote wizard: tapping a selected theme keeps it, 'Sem tema' clears it", async ({ page }) => {
  await page.goto(`/p/${DEMO_SLUG}/orcamento`);
  const none = page.getByRole("button", { name: /Sem tema/ });
  await expect(none).toHaveAttribute("aria-pressed", "true");

  const theme = page.locator('button[aria-pressed]').filter({ hasNotText: "Sem tema" }).first();
  await theme.click();
  await expect(theme).toHaveAttribute("aria-pressed", "true");
  await expect(none).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Tema escolhido:")).toBeVisible();

  await theme.click();
  await expect(theme).toHaveAttribute("aria-pressed", "true");

  await none.click();
  await expect(none).toHaveAttribute("aria-pressed", "true");
  await expect(theme).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Tema escolhido:")).toHaveCount(0);
});
