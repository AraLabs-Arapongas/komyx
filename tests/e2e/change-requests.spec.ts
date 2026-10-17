import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login, uniq } from "./helpers";

/**
 * Pedidos do cliente: o cliente pede pelo link da festa (RPC) e o buffet responde. Aprovar aplica o
 * pedido (extra nos extras da festa; mais pessoas no evento e no orçamento, com o valor recalculado);
 * recusar só responde. O cliente vê status e resposta no payload da reserva.
 */
const TOKEN = "demo-reservation-link-alice-0123456789abcd";

type Snapshot = {
  eventId: string; adults: number; children: number;
  quote: { id: string; adults: number; children: number } | null;
  lines: { organization_id: string; quote_id: string; kind: string; addon_id: string | null; description: string; quantity: number; unit_price: number; sort_order: number }[];
};

test.describe("Pedidos do cliente", () => {
  const ids: string[] = [];
  let snap: Snapshot | null = null;

  test.afterAll(async () => {
    const db = adminDb();
    if (ids.length) {
      await db.from("event_extras").delete().in("description", (await db.from("event_change_requests").select("message").in("id", ids)).data?.map((x) => x.message ?? "") ?? []);
      await db.from("event_change_requests").delete().in("id", ids);
    }
    // Put Alice's party back as the seed left it.
    if (snap) {
      await db.from("events").update({ adults: snap.adults, children: snap.children }).eq("id", snap.eventId);
      if (snap.quote) {
        await db.from("quotes").update({ adults: snap.quote.adults, children: snap.quote.children }).eq("id", snap.quote.id);
        await db.from("quote_items").delete().eq("quote_id", snap.quote.id).in("kind", ["PACKAGE", "EXTRA_PARTICIPANTS"]);
        if (snap.lines.length) await db.from("quote_items").insert(snap.lines);
      }
    }
  });

  test("aprovar aplica o pedido e mostra o valor; recusar só responde", async ({ page }) => {
    const db = adminDb();
    const { data: link } = await db.from("public_links").select("event_id").eq("token", TOKEN).single();
    const { data: ev } = await db.from("events").select("id, adults, children, packages(extra_child_price, included_children)").eq("id", link!.event_id).single();
    const { data: quote } = await db.from("quotes").select("id, adults, children, total").eq("event_id", ev!.id).order("created_at", { ascending: false }).limit(1).single();
    const { data: lines } = await db.from("quote_items").select("organization_id, quote_id, kind, addon_id, description, quantity, unit_price, sort_order").eq("quote_id", quote!.id).in("kind", ["PACKAGE", "EXTRA_PARTICIPANTS"]);
    snap = { eventId: ev!.id, adults: ev!.adults ?? 0, children: ev!.children ?? 0, quote: { id: quote!.id, adults: quote!.adults, children: quote!.children }, lines: lines ?? [] };

    const extra = uniq("Algodão doce");
    const people = uniq("Mais crianças");
    const other = uniq("Mais gente");
    const children = Math.max(ev!.children ?? 0, ev!.packages!.included_children) + 10;
    for (const [kind, message, payload] of [
      ["EXTRA", extra, { description: extra, price: 120 }],
      ["PEOPLE", people, { adults: ev!.adults, children }],
      ["PEOPLE", other, { adults: 99, children: 1 }],
    ] as const) {
      const { data, error } = await db.rpc("reservation_request_change", { p_token: TOKEN, p_kind: kind, p_message: message, p_payload: payload });
      expect(error).toBeNull();
      ids.push(data as string);
    }
    const extraPeople = children - Math.max(ev!.children ?? 0, ev!.packages!.included_children);
    const delta = extraPeople * Number(ev!.packages!.extra_child_price);

    await login(page, ACCOUNTS.owner);
    await page.goto("/solicitacoes?tab=clientes");

    const extraCard = page.locator(`[id="${ids[0]}"]`);
    await extraCard.getByLabel("Resposta ao cliente").fill("Combinado!");
    await extraCard.getByRole("button", { name: /Aprovar · \+ R\$\s?120,00 nos extras/ }).click();
    await expect(extraCard).toHaveCount(0);

    const peopleCard = page.locator(`[id="${ids[1]}"]`);
    await peopleCard.getByRole("button", { name: /Aprovar · \+ R\$/ }).click();
    await expect(peopleCard).toHaveCount(0);

    const otherCard = page.locator(`[id="${ids[2]}"]`);
    await otherCard.getByLabel("Resposta ao cliente").fill("Não cabe no salão.");
    await otherCard.getByRole("button", { name: "Recusar" }).click();
    await expect(otherCard).toHaveCount(0);

    // Approved: the extra is on the party, the head count and the quote total moved by the package price.
    const { data: extras } = await db.from("event_extras").select("unit_price").eq("event_id", ev!.id).eq("description", extra);
    expect(extras?.map((x) => Number(x.unit_price))).toEqual([120]);
    const { data: evAfter } = await db.from("events").select("adults, children").eq("id", ev!.id).single();
    expect(evAfter).toMatchObject({ adults: ev!.adults, children });
    const { data: qAfter } = await db.from("quotes").select("total, children").eq("id", quote!.id).single();
    expect(qAfter!.children).toBe(children);
    expect(Number(qAfter!.total)).toBeCloseTo(Number(quote!.total) + delta, 2);

    // The client sees status and reply; the declined one changed nothing.
    const { data: after } = await db.rpc("reservation_by_token", { p_token: TOKEN });
    const r = after as { requests: { id: string; status: string; reply: string | null }[] };
    expect(r.requests.find((x) => x.id === ids[0])).toMatchObject({ status: "APPROVED", reply: "Combinado!" });
    expect(r.requests.find((x) => x.id === ids[1])).toMatchObject({ status: "APPROVED" });
    expect(r.requests.find((x) => x.id === ids[2])).toMatchObject({ status: "REJECTED", reply: "Não cabe no salão." });

    // Event page: requests live in their own tab.
    await page.goto(`/eventos/${ev!.id}?aba=pedidos`);
    await expect(page.getByRole("link", { name: /Pedidos do cliente/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(extra).first()).toBeVisible();
  });
});
