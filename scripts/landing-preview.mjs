// Full-page preview of the landing for a quick visual check: node scripts/landing-preview.mjs <outdir>
import { chromium } from "@playwright/test";
const out = process.argv[2] ?? ".";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/landing-hero.png` });
await p.getByRole("button", { name: "Próximo" }).click(); await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/landing-hero-2.png` });
await p.locator("text=No celular da dona").scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/landing-app.png` });
await p.locator("text=Tudo registrado").scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/landing-registro.png` });
await b.close();
