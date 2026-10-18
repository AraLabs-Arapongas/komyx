import { test, expect } from "@playwright/test";
import { ACCOUNTS, DEMO_SLUG, adminDb, login, uniq, uniquePhone } from "./helpers";

/** Início: short list of new requests and fixed section order. Seeded requests are removed in afterAll. */
test.describe("Início da dona", () => {
  const phone = uniquePhone();
  let orgId = "";

  test.beforeAll(async () => {
    const db = adminDb();
    const { data: org } = await db.from("organizations").select("id").eq("slug", DEMO_SLUG).single();
    orgId = org!.id;
    const rows = Array.from({ length: 4 }, (_, i) => ({ organization_id: orgId, name: uniq(`Pedido E2E ${i}`), whatsapp: phone, status: "NEW" as const, participants: 30, message: "Mensagem longa que não deve aparecer no Início" }));
    const { error } = await db.from("public_requests").insert(rows);
    if (error) throw error;
  });

  test.afterAll(async () => {
    const db = adminDb();
    await db.from("public_requests").delete().eq("organization_id", orgId).eq("whatsapp", phone);
    await db.from("notifications").delete().eq("organization_id", orgId).like("title", "%Pedido E2E%");
  });

  test("no máximo 3 solicitações, link Ver todas e ordem das seções", async ({ page }) => {
    await login(page, ACCOUNTS.owner);
    await page.goto("/home");

    const { count } = await adminDb().from("public_requests").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "NEW");
    const card = page.getByTestId("home-requests");
    await expect(card).toBeVisible();
    await expect(card.getByTestId("home-request")).toHaveCount(3);
    await expect(card.getByRole("link", { name: `Ver todas (${count})` })).toHaveAttribute("href", "/solicitacoes");
    await expect(card.getByText("Mensagem longa que não deve aparecer")).toHaveCount(0);

    // Top → bottom: urgent (if any), today, requests, next 7 days, money cards
    const ids = ["home-urgent", "home-today", "home-requests", "home-week", "home-money"];
    const ys: number[] = [];
    for (const id of ids) {
      const box = await page.getByTestId(id).boundingBox();
      if (box) ys.push(box.y);
      else expect(id).toBe("home-urgent"); // only the urgent card is optional
    }
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  test("nova solicitação aparece sozinha (sino detecta e atualiza a página)", async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, ACCOUNTS.owner);
    await page.goto("/home");
    await expect(page.getByTestId("home-requests")).toBeVisible();
    const name = uniq("Pedido E2E novo");
    const { error } = await adminDb().from("public_requests").insert({ organization_id: orgId, name, whatsapp: phone, status: "NEW", participants: 20 });
    if (error) throw error;
    // Bell polls every 30 s; a higher unread count triggers router.refresh()
    await expect(page.getByTestId("home-requests").getByText(name)).toBeVisible({ timeout: 45_000 });
  });
});
