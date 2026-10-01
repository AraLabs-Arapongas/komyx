import { test, expect } from "@playwright/test";
import { DEMO_SLUG, adminDb, brDate, cleanupCustomerByPhone, pickFreeDate, uniq, uniquePhone } from "./helpers";

/**
 * Cliente sem login: página pública → wizard → reserva autônoma → página da reserva →
 * encontrar reserva → RSVP de convidado → aceite do contrato.
 */
test.describe("Cliente", () => {
  const phone = uniquePhone();
  const name = uniq("Cliente Online");
  let date = "";
  let eventId = "";

  test.beforeAll(async () => {
    date = await pickFreeDate(DEMO_SLUG, 50);
  });

  test.afterAll(async () => {
    await cleanupCustomerByPhone(DEMO_SLUG, phone);
  });

  test("página pública carrega com pacotes e footer", async ({ page }) => {
    await page.goto(`/p/${DEMO_SLUG}?src=instagram`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/festa/i);
    await expect(page.getByText("Mais escolhido")).toBeVisible();
    await expect(page.getByRole("link", { name: /Monte seu orçamento/ })).toBeVisible();
    await expect(page.getByText("Desenvolvido por")).toBeVisible();
    await expect(page.getByRole("img", { name: "AraLabs" })).toBeVisible();
  });

  test("reserva autônoma com Pix e página da reserva", async ({ page }) => {
    await page.goto(`/p/${DEMO_SLUG}/orcamento?src=instagram`);

    // 1. Pacote
    await page.getByRole("button", { name: /Pacote Prata/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // 2. Data: navigate months until the target month, then click the day
    const [y, m, d] = date.split("-").map(Number);
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const target = `${months[m - 1]} de ${y}`;
    for (let i = 0; i < 4; i++) {
      if ((await page.getByText(target, { exact: true }).count()) > 0) break;
      await page.getByRole("button", { name: "Próximo mês" }).click();
    }
    await expect(page.getByText(target, { exact: true })).toBeVisible();
    const dayBtn = page.getByRole("button", { name: brDate(date), exact: true });
    await expect(dayBtn).toBeEnabled();
    await dayBtn.click();
    await expect(page.getByText(`Festa em ${brDate(date)}`)).toBeVisible();
    void d;
    await page.getByRole("button", { name: "Continuar" }).click();

    // 3. Pessoas + adicional
    await page.getByLabel("Adultos", { exact: true }).fill("40"); // 10 extra
    await page.getByRole("button", { name: "Mais Hora extra" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // 4. Dados
    await page.getByLabel("Seu nome", { exact: true }).fill(name);
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone);
    await page.getByLabel("Aniversariante", { exact: true }).fill("Nina");
    await page.getByLabel("Nascimento", { exact: true }).fill("2021-05-05");
    await page.getByRole("button", { name: "Continuar" }).click();

    // 5. Revisão: 3900 + 10*65 + 450 = 5000 ; sinal 30% = 1500
    await expect(page.getByText("Confira antes de enviar")).toBeVisible();
    await expect(page.getByText("R$ 5.000,00").first()).toBeVisible();
    const how = page.locator("div", { hasText: "Como funciona a reserva" }).last();
    await expect(how).toContainText("R$ 1.500,00");
    await expect(how).toContainText("(30%)");
    await expect(how).toContainText("48 horas");
    await page.getByRole("button", { name: "Reservar esta data" }).click();

    // Confirmação com Pix, QR, código e link permanente
    await expect(page.getByText("Data reservada")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("img", { name: "QR Code Pix" })).toBeVisible();
    await expect(page.getByText(/Código da reserva: FESTA[A-Z0-9]+/)).toBeVisible();
    await expect(page.getByText("12.345.678/0001-90").first()).toBeVisible();
    const link = await page.getByText(/\/r\/[0-9a-f]{48}/).first().textContent();
    const token = link!.match(/\/r\/([0-9a-f]{48})/)![1];

    // Banco: reserva com origem SELF_SERVICE, orçamento enviado, parcelas, aniversariante
    const db = adminDb();
    const { data: customer } = await db.from("customers").select("id, source").eq("whatsapp", phone).single();
    expect(customer?.source).toBe("instagram");
    const { data: ev } = await db.from("events").select("id, status, origin, pix_txid, expires_at, quotes(status, total, quote_installments(amount))").eq("customer_id", customer!.id).single();
    eventId = ev!.id;
    expect(ev?.status).toBe("PRE_RESERVED");
    expect(ev?.origin).toBe("SELF_SERVICE");
    expect(ev?.pix_txid).toMatch(/^FESTA/);
    expect(Number(ev?.quotes[0].total)).toBe(5000);
    expect(ev?.quotes[0].status).toBe("SENT");
    const { data: celebrant } = await db.from("celebrants").select("name").eq("customer_id", customer!.id).single();
    expect(celebrant?.name).toBe("Nina");

    // Página da reserva
    await page.goto(`/r/${token}`);
    await expect(page.getByText("Reservada")).toBeVisible();
    await expect(page.getByRole("img", { name: "QR Code Pix" })).toBeVisible();
    await expect(page.getByText("Pacote Prata").first()).toBeVisible();

    // Dia ficou ocupado no calendário público
    const month = date.slice(0, 7);
    const busy = await page.request.get(`/p/${DEMO_SLUG}/disponibilidade?m=${month}`);
    expect((await busy.json()).busy).toContain(date);
  });

  test("convidado confirma presença e baixa .ics; contrato aceito pelo link", async ({ page }) => {
    const db = adminDb();
    const { data: org } = await db.from("organizations").select("id").eq("slug", DEMO_SLUG).single();
    const { data: guestLink } = await db.from("public_links").insert({ organization_id: org!.id, event_id: eventId, type: "GUEST_CONFIRM" }).select("token").single();

    await page.goto(`/g/${guestLink!.token}`);
    await expect(page.getByText("Você está convidado para")).toBeVisible();
    await page.getByLabel("Seu nome (ou da família)").fill("Convidado E2E");
    await page.getByLabel("Adultos", { exact: true }).fill("2");
    await page.getByLabel("Crianças", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Confirmar presença" }).click();
    await expect(page.getByText("Presença confirmada")).toBeVisible();
    const ics = await page.request.get(`/g/${guestLink!.token}/evento.ics`);
    expect(ics.status()).toBe(200);
    expect(await ics.text()).toContain("BEGIN:VEVENT");

    const { data: guests } = await db.from("guests").select("name, adults, children, source").eq("event_id", eventId);
    expect(guests).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Convidado E2E", adults: 2, children: 2, source: "PUBLIC" })]));

    // Contract: generated via DB with the org template rendered server-side is covered by owner.spec;
    // here we verify the public accept flow on a minimal contract.
    const { data: contract } = await db.from("contracts").insert({ organization_id: org!.id, event_id: eventId, content: "CONTRATO E2E\n\nTexto de teste com mais de cinquenta caracteres para passar na validação." , status: "SENT" }).select("token").single();
    await page.goto(`/c/${contract!.token}`);
    await expect(page.getByText("Aguardando aceite")).toBeVisible();
    await page.getByLabel("Seu nome completo").fill("Cliente Online Aceite");
    await page.getByLabel(/Li o contrato/).check();
    await page.getByRole("button", { name: "Aceitar contrato" }).click();
    await expect(page.getByText("Contrato aceito. Obrigado!")).toBeVisible();
    const pdf = await page.request.get(`/c/${contract!.token}/pdf`);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  });
});
