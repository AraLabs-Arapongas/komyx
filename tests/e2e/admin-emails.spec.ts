import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login, logout, pickOption, uniq } from "./helpers";

/**
 * Admin: e-mail templates (preview, test send, save), message log + resend, platform announcements
 * (e-mail with confirmation, owner banner, dismiss, end). EMAIL_PROVIDER=log locally: nothing real goes out.
 * Everything created here is deleted in afterAll; the edited template is restored.
 */
test.describe("Admin e-mails e avisos", () => {
  const db = adminDb();
  const tag = uniq("e2e-msg");
  let originalTemplate: { title: string } | null = null;
  let notificationId: string | null = null;

  test.afterAll(async () => {
    if (originalTemplate) await db.from("email_templates").update({ title: originalTemplate.title }).eq("key", "contract_accepted");
    await db.from("platform_announcements").delete().like("title", `${tag}%`);
    await db.from("message_log").delete().like("subject", `%${tag}%`);
    if (notificationId) {
      await db.from("message_log").delete().eq("notification_id", notificationId);
      await db.from("notifications").delete().eq("id", notificationId);
    }
  });

  test("modelo: prévia, teste para mim e salvar", async ({ page }) => {
    const { data: tpl } = await db.from("email_templates").select("title").eq("key", "contract_accepted").single();
    originalTemplate = tpl;
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/emails?tab=modelos&key=contract_accepted");
    await expect(page.getByText("Variáveis")).toBeVisible();

    const title = `${tag} contrato`;
    await page.getByLabel("Título").fill(title);
    await expect(page.frameLocator('iframe[title="Prévia do e-mail"]').getByText(title)).toBeVisible();

    await page.getByRole("button", { name: "Enviar teste para mim" }).click();
    await expect(page.getByText(`Teste enviado para ${ACCOUNTS.admin.email}.`)).toBeVisible();
    const { data: testLog } = await db.from("message_log").select("status, kind").eq("to_address", ACCOUNTS.admin.email).eq("kind", "test").order("created_at", { ascending: false }).limit(1).single();
    expect(testLog?.status).toBe("sent");

    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByText("Modelo salvo.")).toBeVisible();
    const { data: saved } = await db.from("email_templates").select("title").eq("key", "contract_accepted").single();
    expect(saved?.title).toBe(title);
    const { data: audit } = await db.from("admin_audit").select("action").eq("action", "template.update").order("created_at", { ascending: false }).limit(1).single();
    expect(audit?.action).toBe("template.update");
  });

  test("envios: filtro de falhas e reenviar", async ({ page }) => {
    const { data: owner } = await db.from("profiles").select("organization_id").eq("email", ACCOUNTS.owner.email).single();
    // emailed_at already set: the notification trigger finds nothing to send.
    const { data: n } = await db.from("notifications").insert({ organization_id: owner!.organization_id, type: "contract_accepted", title: `${tag} Ana`, body: "Aniversário", href: "/eventos", emailed_at: new Date().toISOString() }).select("id").single();
    notificationId = n!.id;
    await db.from("message_log").insert({ channel: "email", kind: "notification", organization_id: owner!.organization_id, notification_id: notificationId, to_address: ACCOUNTS.owner.email, subject: `Falhou ${tag}`, status: "failed", error: "Resend: 500 teste" });

    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/emails?status=failed");
    const row = page.getByTestId("message-row").filter({ hasText: `Falhou ${tag}` });
    await expect(row).toBeVisible();
    await expect(row.getByText("Resend: 500 teste")).toBeVisible();
    await row.getByRole("button", { name: "Reenviar" }).click();
    await expect(row.getByText("Reenviado.")).toBeVisible();

    const { data: resent } = await db.from("message_log").select("status, to_address").eq("notification_id", notificationId).eq("kind", "resend").single();
    expect(resent).toEqual({ status: "sent", to_address: ACCOUNTS.owner.email });

    // Filters live in the URL.
    await pickOption(page, "Canal", "SMS");
    await page.waitForURL(/channel=sms/);
    await expect(page.getByTestId("message-row").filter({ hasText: `Falhou ${tag}` })).toHaveCount(0);
  });

  test("aviso: e-mail com confirmação, faixa no app do dono, fechar e encerrar", async ({ page }) => {
    const title = `${tag} aviso`;
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/avisos");
    await page.getByLabel("Título").fill(title);
    await page.getByLabel("Texto", { exact: true }).fill("Nova função no ar.");
    await pickOption(page, "Tom", "Novidade");
    await page.getByLabel("Link (opcional)").fill("/conta");
    await page.getByLabel("Texto do link").fill("Ver conta");
    await page.getByLabel(/Enviar também por e-mail para os donos/).check();
    await page.getByRole("button", { name: "Publicar e enviar e-mail" }).click();
    await expect(page.getByText("não pode ser desfeito")).toBeVisible();
    await page.getByRole("button", { name: /Confirmar e enviar para/ }).click();
    await expect(page.getByText(/Aviso salvo e enviado para \d+ dono/)).toBeVisible();

    const { data: a } = await db.from("platform_announcements").select("id, emailed_at").eq("title", title).single();
    expect(a?.emailed_at).toBeTruthy();
    const row = page.getByTestId("announcement-row").filter({ hasText: title });
    await expect(row).toBeVisible();
    // Already e-mailed: no second send offered.
    await expect(row.getByRole("button", { name: "Enviar por e-mail" })).toHaveCount(0);

    await logout(page);
    await login(page, ACCOUNTS.owner);
    const banner = page.getByTestId("announcement").filter({ hasText: title });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("link", { name: "Ver conta" })).toHaveAttribute("href", "/conta");
    await banner.getByRole("button", { name: "Fechar aviso" }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("announcement").filter({ hasText: title })).toHaveCount(0);

    await logout(page);
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/avisos");
    await page.getByTestId("announcement-row").filter({ hasText: title }).getByRole("button", { name: "Encerrar agora" }).click();
    await expect(page.getByRole("heading", { name: /Encerrados/ })).toBeVisible();
    await expect.poll(async () => (await db.from("platform_announcements").select("ends_at").eq("id", a!.id).single()).data?.ends_at).toBeTruthy();
  });
});
