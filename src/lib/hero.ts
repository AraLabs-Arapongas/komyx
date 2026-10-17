/** Hero of the public page: the buffet picks how its own photos open the page (organizations.hero_style). */
export type HeroStyle = "cinema" | "bolha" | "colagem" | "confete";

export const HERO_STYLES: Record<HeroStyle, { label: string; description: string }> = {
  cinema: { label: "Cinema", description: "Tela cheia com suas fotos passando devagar, como um filme da festa." },
  bolha: { label: "Bolha", description: "Fundo escuro, texto à esquerda e a capa recortada em bolha com rabiscos." },
  colagem: { label: "Colagem", description: "Duas fotos em formas orgânicas sobrepostas, com sol, estrela e nuvem." },
  confete: { label: "Confete", description: "A capa dentro de um grande círculo amarelo com confete caindo." },
};

export const DEFAULT_HERO_STYLE: HeroStyle = "cinema";

export function resolveHeroStyle(raw: unknown): HeroStyle {
  return typeof raw === "string" && raw in HERO_STYLES ? (raw as HeroStyle) : DEFAULT_HERO_STYLE;
}

export type TitleSegment = { text: string; tone: "plain" | "sun" };

/**
 * Which words of the tagline turn yellow. Deterministic: with two or more sentences the last one
 * is highlighted; a single sentence highlights its last two or three words (none if it is very short).
 */
export function titleSegments(title: string): TitleSegment[] {
  const sentences = title.match(/[^.!?]+[.!?]*\s*/g)?.filter((s) => s.trim()) ?? [];
  if (sentences.length >= 2) {
    const last = sentences[sentences.length - 1];
    return [{ text: sentences.slice(0, -1).join(""), tone: "plain" }, { text: last.trimEnd(), tone: "sun" }];
  }
  const words = title.trim().split(/\s+/);
  if (words.length < 4) return [{ text: title.trim(), tone: "plain" }];
  const n = words.length >= 7 ? 3 : 2;
  return [{ text: `${words.slice(0, -n).join(" ")} `, tone: "plain" }, { text: words.slice(-n).join(" "), tone: "sun" }];
}
