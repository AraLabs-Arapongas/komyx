import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login, uniq } from "./helpers";

/**
 * Pedidos do cliente: o cliente pede pelo link da festa (RPC), o buffet aprova ou recusa com resposta
 * e o cliente vê a resposta no payload da reserva. A festa não muda com a decisão.
 */
const TOKEN = "demo-reservation-link-alice-0123456789abcd";

test.describe("Pedidos do cliente", () => {
  const ids: string[] = [];

  test.afterAll(async () => {
    if (ids.length) await adminDb().from("event_change_requests").delete().in("id", ids);
  });

  test("buffet aprova e recusa com resposta", async ({ page }) => {
    const db = adminDb();
    const extra = uniq("Algodão doce");
    const people = uniq("Mais gente");
    for (const [kind, message, payload] of [["EXTRA", extra, { description: extra, price: 120 }], ["PEOPLE", people, { adults: 99, children: 1 }]] as const) {
      const { data, error } = await db.rpc("reservation_request_change", { p_token: TOKEN, p_kind: kind, p_message: message, p_payload: payload });
      expect(error).toBeNull();
      ids.push(data as string);
    }
    const { data: before } = await db.rpc("reservation_by_token", { p_token: TOKEN });
    const adultsBefore = (before as { event: { adults: number } }).event.adults;

    await login(page, ACCOUNTS.owner);
    await page.goto("/solicitacoes?tab=clientes");
    const extraCard = page.locator(`[id="${ids[0]}"]`);
    await expect(extraCard).toContainText(extra);
    await extraCard.getByLabel("Resposta ao cliente").fill("Combinado!");
    await extraCard.getByRole("button", { name: "Aprovar" }).click();
    await expect(extraCard).toHaveCount(0);

    const peopleCard = page.locator(`[id="${ids[1]}"]`);
    await peopleCard.getByLabel("Resposta ao cliente").fill("Não cabe no salão.");
    await peopleCard.getByRole("button", { name: "Recusar" }).click();
    await expect(peopleCard).toHaveCount(0);

    await page.goto("/solicitacoes?tab=clientes&f=respondidos");
    await expect(page.locator(`[id="${ids[0]}"]`)).toContainText("Aprovado");
    await expect(page.locator(`[id="${ids[0]}"]`)).toContainText("Combinado!");
    await expect(page.locator(`[id="${ids[1]}"]`)).toContainText("Recusado");

    // The client sees the answer; the party itself is unchanged.
    const { data: after } = await db.rpc("reservation_by_token", { p_token: TOKEN });
    const r = after as { event: { adults: number }; requests: { id: string; status: string; reply: string | null }[] };
    expect(r.requests.find((x) => x.id === ids[0])).toMatchObject({ status: "APPROVED", reply: "Combinado!" });
    expect(r.requests.find((x) => x.id === ids[1])).toMatchObject({ status: "REJECTED", reply: "Não cabe no salão." });
    expect(r.event.adults).toBe(adultsBefore);
  });
});
