/**
 * Komyx festive theme: the same palette as the landing and the buffet pages.
 * Cream paper, ink navy text, berry as the action color, sun/mint/sky as accents.
 */
export const colors = {
  background: "#fffdf7", // paper
  surface: "#ffffff",
  elevated: "#fff4e3", // paper-2
  foreground: "#1b1f3a", // ink
  muted: "#5b5f7a",
  dim: "#9da1bd",
  border: "#ece7dc",
  brand: "#e8356d", // berry
  brandDeep: "#c2184f",
  brandSoft: "#fde7ef",
  brandFg: "#ffffff",
  ink: "#1b1f3a",
  sun: "#ffc43d",
  sunSoft: "#fff4cf",
  mint: "#2ec4a6",
  mintSoft: "#dcf5ee",
  sky: "#4cb5f5",
  skySoft: "#e3f3fd",
  stone50: "#fffdf7",
  stone100: "#fff4e3",
  green: "#059669",
  greenSoft: "#d1fae5",
  amber: "#b45309",
  amberSoft: "#fef3c7",
  red: "#dc2626",
  redSoft: "#fee2e2",
  slate: "#475569",
  slateSoft: "#e2e8f0",
};

export const tones = {
  amber: { bg: "#fff1c9", fg: "#92400e" },
  green: { bg: "#dcf5ee", fg: "#065f46" },
  slate: { bg: "#e7e9f5", fg: "#3b4065" },
  red: { bg: "#fee2e2", fg: "#991b1b" },
  zinc: { bg: "#efebe3", fg: "#5b5f7a" },
  brand: { bg: "#fde7ef", fg: "#c2184f" },
} as const;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

/** Nunito weights loaded in src/ui/fonts.ts. Use these names in fontFamily. */
export const fonts = {
  regular: "Nunito_400Regular",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extrabold: "Nunito_800ExtraBold",
  black: "Nunito_900Black",
} as const;

/** Soft shadow for cards and floating things. */
export const shadow = { shadowColor: "#1b1f3a", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 } as const;
