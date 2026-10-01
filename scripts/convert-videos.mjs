// Converts ./videos/*.webm to .mp4 (H.264) when ffmpeg is available, so the files open anywhere.
import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "videos");
if (!existsSync(dir)) process.exit(0);
let hasFfmpeg = true;
try { execSync("ffmpeg -version", { stdio: "ignore" }); } catch { hasFfmpeg = false; }
if (!hasFfmpeg) { console.log("ffmpeg não encontrado; vídeos ficam em .webm"); process.exit(0); }
for (const f of readdirSync(dir).filter((f) => f.endsWith(".webm"))) {
  const src = join(dir, f);
  const dest = src.replace(/\.webm$/, ".mp4");
  execSync(`ffmpeg -y -loglevel error -i "${src}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -crf 23 "${dest}"`);
  console.log("→", dest);
}
