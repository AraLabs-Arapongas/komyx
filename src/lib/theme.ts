/** Premium site customization. Basic plans always render the default invitation look. */
export type FontPreset = "festa" | "elegante" | "moderno";

export type OrgTheme = {
  primary: string; // CTA / highlights
  accent: string;  // badges, stars
  ink: string;     // dark surfaces + text
  paper: string;   // page background
  font: FontPreset;
};

export const DEFAULT_THEME: OrgTheme = { primary: "#e8356d", accent: "#ffc43d", ink: "#1b1f3a", paper: "#fffdf7", font: "festa" };

export const FONT_PRESETS: Record<FontPreset, { label: string; description: string }> = {
  festa: { label: "Festa", description: "Nunito, títulos bem pesados. Alegre e redondo, sem serifa." },
  elegante: { label: "Elegante", description: "Fraunces + Source Sans 3. Para buffets de casamento e eventos sociais." },
  moderno: { label: "Moderno", description: "Space Grotesk + Inter. Reto e minimalista." },
};

const HEX = /^#[0-9a-f]{6}$/i;

export function resolveTheme(plan: string, raw: unknown): OrgTheme {
  if (plan !== "premium" || !raw || typeof raw !== "object") return DEFAULT_THEME;
  const t = raw as Partial<Record<keyof OrgTheme, unknown>>;
  const pick = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);
  const font = typeof t.font === "string" && t.font in FONT_PRESETS ? (t.font as FontPreset) : DEFAULT_THEME.font;
  return { primary: pick(t.primary, DEFAULT_THEME.primary), accent: pick(t.accent, DEFAULT_THEME.accent), ink: pick(t.ink, DEFAULT_THEME.ink), paper: pick(t.paper, DEFAULT_THEME.paper), font };
}

/** Inline CSS variables that override the .public-theme defaults. */
export function themeStyle(theme: OrgTheme): React.CSSProperties {
  return {
    "--berry": theme.primary,
    "--sun": theme.accent,
    "--ink": theme.ink,
    "--paper": theme.paper,
    "--brand": theme.primary,
    "--background": theme.paper,
    "--foreground": theme.ink,
  } as React.CSSProperties;
}
