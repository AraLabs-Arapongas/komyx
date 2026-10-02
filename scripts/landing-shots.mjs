// Real product screenshots for the landing hero. Needs the dev server + seed: node scripts/landing-shots.mjs
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => l.split("=").map((s) => s.trim())));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const base = "http://localhost:3000";
const b = await chromium.launch();
const SIDEBAR = 240;

async function save(page, name, clip) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `public/landing/${name}`, clip, animations: "disabled", timeout: 15_000 });
  console.log("saved", name);
}
async function boxOf(page, text) {
  const card = page.locator(`xpath=//*[contains(@class,'rounded-2xl') and .//*[normalize-space(text())='${text}']]`).first();
  return card.boundingBox();
}

// Owner (desktop, logged in)
const owner = await b.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2 });
await owner.goto(`${base}/login`);
await owner.getByLabel("E-mail").fill("dona@festabuffet.test");
await owner.getByLabel("Senha").fill("senha12345");
await owner.getByRole("button", { name: "Entrar" }).click();
await owner.waitForURL(/\/home/, { timeout: 60_000 });
await owner.waitForSelector("text=Ação urgente");
await save(owner, "home.png", { x: SIDEBAR, y: 56, width: 940, height: 620 });

const { data: julia } = await db.from("events").select("id").eq("title", "Aniversário da Júlia").single();
await owner.goto(`${base}/eventos/${julia.id}`);
await owner.waitForSelector("text=Recebimentos");
const pay = await boxOf(owner, "Pagamentos");
await owner.evaluate((y) => window.scrollTo(0, y - 70), pay.y);
const pay2 = await boxOf(owner, "Pagamentos");
await save(owner, "pagamentos.png", { x: pay2.x, y: pay2.y, width: pay2.width, height: Math.min(pay2.height, 560) });

await owner.goto(`${base}/agenda?view=month`);
await owner.waitForSelector("text=Outubro");
await save(owner, "agenda.png", { x: SIDEBAR, y: 56, width: 940, height: 690 });

const { data: contract } = await db.from("contracts").select("id, event_id").in("status", ["ACCEPTED", "SENT", "DRAFT"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
if (contract) {
  await owner.goto(`${base}/eventos/${contract.event_id}/contrato?c=${contract.id}`);
  await owner.waitForSelector("textarea[name=content]");
  await save(owner, "contrato.png", { x: SIDEBAR, y: 56, width: 940, height: 690 });
}

// Public wizard – calendar step
const pub = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
await pub.goto(`${base}/p/festa-cia-buffet/orcamento`);
await pub.waitForSelector("text=Qual pacote?");
await pub.getByText("Pacote Prata", { exact: true }).click();
await pub.getByRole("button", { name: "Continuar" }).click();
await pub.waitForSelector("text=Qual dia?");
await save(pub, "orcamento.png", { x: 120, y: 0, width: 940, height: 760 });

// Client reservation (mobile) – Pix
const { data: link } = await db.from("public_links").select("token, events!inner(title)").eq("type", "RESERVATION").eq("active", true).eq("events.title", "Festa do Theo").limit(1).single();
const mob = await b.newPage({ viewport: { width: 420, height: 880 }, deviceScaleFactor: 2 });
await mob.goto(`${base}/r/${link.token}`);
await mob.waitForSelector("text=Orçamento");
await save(mob, "reserva.png");

// Door (mobile)
const { data: door } = await db.from("public_links").select("token").eq("type", "CHECKIN").eq("event_id", julia.id).eq("active", true).limit(1).single();
await mob.goto(`${base}/d/${door.token}`);
await mob.waitForSelector("text=Portaria");
await mob.getByRole("button", { name: /Pedidos \(/ }).click();
await mob.waitForSelector("text=Fechar conta");
await save(mob, "portaria.png");

await b.close();
