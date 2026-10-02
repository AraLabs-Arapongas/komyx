import { test as base, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const CAPTION_KEY = "komyx:demo-caption";

/**
 * Bottom-of-screen caption that survives navigations: the text lives in sessionStorage and an
 * init script re-renders it on every page load.
 */
const INIT = `
(() => {
  const render = () => {
    const text = sessionStorage.getItem(${JSON.stringify(CAPTION_KEY)});
    if (!document.body) return;
    let el = document.getElementById("komyx-caption");
    if (!text) { el?.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "komyx-caption";
      el.setAttribute("aria-hidden", "true");
      Object.assign(el.style, {
        position: "fixed", left: "50%", bottom: "28px", transform: "translateX(-50%)",
        maxWidth: "900px", padding: "14px 22px", borderRadius: "16px",
        background: "rgba(27,31,58,0.92)", color: "#fff", fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontSize: "22px", fontWeight: "700", lineHeight: "1.3", textAlign: "center",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)", zIndex: "2147483647", pointerEvents: "none",
        letterSpacing: "-0.01em", border: "2px solid #ffc43d",
      });
      document.body.appendChild(el);
    }
    el.textContent = text;
  };
  window.__komyxCaption = render;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
  new MutationObserver(() => { if (!document.getElementById("komyx-caption")) render(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
`;

export async function installCaptions(page: Page) {
  await page.addInitScript(INIT);
}

/** Shows a caption and holds it on screen for `holdMs` so viewers can read it. */
export async function caption(page: Page, text: string, holdMs = 2200) {
  await page.evaluate(
    ([key, t]) => {
      sessionStorage.setItem(key, t);
      (window as unknown as { __komyxCaption?: () => void }).__komyxCaption?.();
    },
    [CAPTION_KEY, text] as const,
  ).catch(() => null);
  await page.waitForTimeout(holdMs);
}

export async function clearCaption(page: Page) {
  await page.evaluate((key) => { sessionStorage.removeItem(key); document.getElementById("komyx-caption")?.remove(); }, CAPTION_KEY).catch(() => null);
}

/** Briefly outlines an element before interacting with it (there is no cursor in the recording). */
export async function spotlight(page: Page, selector: ReturnType<Page["locator"]>) {
  await selector.evaluate((el) => {
    const h = el as HTMLElement;
    const prev = h.style.boxShadow;
    h.style.transition = "box-shadow .15s";
    h.style.boxShadow = "0 0 0 4px #ffc43d, 0 0 0 8px rgba(232,53,109,.6)";
    setTimeout(() => { h.style.boxShadow = prev; }, 1200);
  }).catch(() => null);
  await page.waitForTimeout(500);
}

/** Saves this test's video under ./videos/<name>.webm after the page is closed. */
export async function saveVideo(page: Page, testInfo: TestInfo, name: string) {
  const video = page.video();
  await page.close();
  if (!video) return;
  const src = await video.path();
  mkdirSync(join(process.cwd(), "videos"), { recursive: true });
  const dest = join(process.cwd(), "videos", `${name}.webm`);
  renameSync(src, dest);
  testInfo.annotations.push({ type: "video", description: dest });
}

export const test = base;
