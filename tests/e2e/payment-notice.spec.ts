import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login } from "./helpers";

/**
 * "Já paguei" e "Pagar outro valor" na página da reserva (/r/<token>): o cliente gera um Pix de outro
 * valor (mesma chave e identificador) e avisa quanto pagou; o buffet vê o aviso com esse valor.
 */
const TOKEN = "demo-reservation-link-alice-0123456789abcd";

test.describe("Aviso de pagamento pelo link da reserva", () => {
  const ids: string[] = [];

  test.afterAll(async () => {
    if (ids.length) await adminDb().from("event_change_requests").delete().in("id", ids);
  });

  test("cliente paga outro valor e avisa R$ 500; o buffet vê R$ 500", async ({ page, context }) => {
    const db = adminDb();
    const { data: link } = await db.from("public_links").select("event_id").eq("token", TOKEN).single();
    const eventId = link!.event_id!;
    // Leftovers from a failed run would block the notice (one pending at a time).
    await db.from("event_change_requests").delete().eq("event_id", eventId).eq("kind", "PAYMENT_NOTICE").eq("status", "PENDING");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto(`/r/${TOKEN}`);
    // Another amount: same key and txid, new amount in the copy-paste code.
    await page.getByRole("button", { name: "Pagar outro valor" }).click();
    await page.getByLabel("Quanto você quer pagar agora?").fill("300000000");
    await expect(page.getByText(/Máximo R\$/)).toBeVisible();
    await page.getByLabel("Quanto você quer pagar agora?").fill("500,00");
    await page.getByRole("button", { name: "Gerar Pix" }).click();
    await expect(page.getByTestId("pix-amount")).toHaveText(/R\$\s?500,00/);
    await expect(page.getByRole("img", { name: /QR Code Pix de R\$\s?500,00/ })).toBeVisible();
    await page.getByRole("button", { name: "Copiar código" }).click();
    const code = await page.evaluate(() => navigator.clipboard.readText());
    expect(code).toContain("5406500.00");
    expect(code).toContain("FESTAALICE000007");

    // "Já paguei" comes prefilled with the amount on screen.
    await page.getByRole("button", { name: "Já paguei, avisar o buffet" }).click();
    await expect(page.getByLabel("Quanto você pagou?")).toHaveValue("500,00");
    await page.getByRole("button", { name: "Avisar o buffet" }).click();
    await expect(page.getByText("Aviso enviado.")).toBeVisible();

    const { data: reqs } = await db.from("event_change_requests").select("id, payload, status").eq("event_id", eventId).eq("kind", "PAYMENT_NOTICE").eq("status", "PENDING");
    expect(reqs).toHaveLength(1);
    ids.push(reqs![0].id);
    expect(reqs![0].payload).toMatchObject({ amount: 500, txid: "FESTAALICE000007" });

    // A second notice waits until the buffet checks the first.
    await page.reload();
    await expect(page.getByText("Você já avisou um pagamento.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Já paguei, avisar o buffet" })).toHaveCount(0);

    await login(page, ACCOUNTS.owner);
    await page.goto("/solicitacoes?tab=clientes");
    const card = page.locator(`[id="${ids[0]}"]`);
    await expect(card.getByText(/R\$\s?500,00/).first()).toBeVisible();
    await expect(card.getByRole("button", { name: /Aprovar · registrar R\$\s?500,00/ })).toBeVisible();
  });
});
