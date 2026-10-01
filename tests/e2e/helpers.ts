import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import type { Page } from "@playwright/test";
import type { Database } from "../../src/lib/database.types";

config({ path: ".env.local" });

export const ACCOUNTS = {
  owner: { email: "dona@festabuffet.test", password: "senha12345" },
  staff: { email: "ana@festabuffet.test", password: "senha12345" },
  admin: { email: "admin@festeja.test", password: "senha12345" },
};
export const DEMO_SLUG = "festa-cia-buffet";

/** Service-role client: bypasses RLS. Used only to seed/clean test data. */
export function adminDb() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
}

export function uniq(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Unique Brazilian mobile number (11 digits) for a test customer. */
export function uniquePhone() {
  return `119${String(Date.now()).slice(-8)}`;
}

export async function login(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(account.email);
  await page.getByLabel("Senha").fill(account.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(home|admin)/, { timeout: 60_000 });
}

export async function logout(page: Page) {
  await page.request.post("/auth/signout");
}

/** First free day (one-event-per-day) at least `minDaysAhead` days from now, as YYYY-MM-DD. */
export async function pickFreeDate(slug: string, minDaysAhead = 45) {
  const db = adminDb();
  const start = new Date(Date.now() + minDaysAhead * 86_400_000);
  const from = start.toISOString().slice(0, 10);
  const to = new Date(start.getTime() + 60 * 86_400_000).toISOString().slice(0, 10);
  const { data: busy } = await db.rpc("busy_days", { p_slug: slug, p_from: from, p_to: to });
  const busySet = new Set((busy ?? []) as string[]);
  for (let i = 0; i < 60; i++) {
    const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    if (!busySet.has(d)) return d;
  }
  throw new Error("No free date found");
}

export function brDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Deletes everything that hangs off a customer phone inside an org (events cascade quotes, guests, links...). */
export async function cleanupCustomerByPhone(orgSlug: string, phone: string) {
  const db = adminDb();
  const { data: org } = await db.from("organizations").select("id").eq("slug", orgSlug).single();
  if (!org) return;
  const { data: customers } = await db.from("customers").select("id").eq("organization_id", org.id).eq("whatsapp", phone);
  for (const c of customers ?? []) {
    await db.from("events").delete().eq("customer_id", c.id);
    await db.from("celebrants").delete().eq("customer_id", c.id);
    await db.from("customers").delete().eq("id", c.id);
  }
  await db.from("public_requests").delete().eq("organization_id", org.id).eq("whatsapp", phone);
}

/** Deletes an organization created by a test, including its auth users. */
export async function cleanupOrgBySlug(slug: string) {
  const db = adminDb();
  const { data: org } = await db.from("organizations").select("id").eq("slug", slug).maybeSingle();
  if (!org) return;
  const { data: members } = await db.from("profiles").select("id").eq("organization_id", org.id);
  for (const m of members ?? []) await db.auth.admin.deleteUser(m.id);
  await db.from("organizations").delete().eq("id", org.id);
}

export async function deleteUserByEmail(email: string) {
  const db = adminDb();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  if (profile) await db.auth.admin.deleteUser(profile.id);
}
