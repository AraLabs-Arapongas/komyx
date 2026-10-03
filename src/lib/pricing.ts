/** Shared pricing helpers (client + server). */

export type PackagePricing = {
  id: string;
  name: string;
  base_price: number | string;
  included_adults: number;
  included_children: number;
  extra_adult_price: number | string;
  extra_child_price: number | string;
};

export type AddonPricing = { id: string; name: string; price: number | string };

export type QuoteLine = {
  kind: "PACKAGE" | "ADDON" | "EXTRA_PARTICIPANTS" | "CUSTOM";
  addon_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
};

/** Builds the standard quote lines from a package, participant counts and chosen addons. */
export function buildQuoteLines(pkg: PackagePricing | null, adults: number, children: number, addons: { addon: AddonPricing; quantity: number }[]): QuoteLine[] {
  const lines: QuoteLine[] = [];
  if (pkg) {
    lines.push({ kind: "PACKAGE", addon_id: null, description: pkg.name, quantity: 1, unit_price: Number(pkg.base_price), sort_order: 0 });
    const extraAdults = Math.max(adults - pkg.included_adults, 0);
    const extraChildren = Math.max(children - pkg.included_children, 0);
    if (extraAdults > 0 && Number(pkg.extra_adult_price) > 0) {
      lines.push({ kind: "EXTRA_PARTICIPANTS", addon_id: null, description: `Adultos adicionais (${extraAdults})`, quantity: extraAdults, unit_price: Number(pkg.extra_adult_price), sort_order: 1 });
    }
    if (extraChildren > 0 && Number(pkg.extra_child_price) > 0) {
      lines.push({ kind: "EXTRA_PARTICIPANTS", addon_id: null, description: `Crianças adicionais (${extraChildren})`, quantity: extraChildren, unit_price: Number(pkg.extra_child_price), sort_order: 2 });
    }
  }
  for (const { addon, quantity } of addons) {
    if (quantity > 0) lines.push({ kind: "ADDON", addon_id: addon.id, description: addon.name, quantity, unit_price: Number(addon.price), sort_order: 5 });
  }
  return lines;
}

export function sumLines(lines: { quantity: number; unit_price: number }[]) {
  return Math.round(lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0) * 100) / 100;
}

export function extrasFor(pkg: PackagePricing | null, adults: number, children: number) {
  if (!pkg) return { extraAdults: 0, extraChildren: 0 };
  return { extraAdults: Math.max(adults - pkg.included_adults, 0), extraChildren: Math.max(children - pkg.included_children, 0) };
}

export const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "facebook", label: "Facebook" },
  { value: "site", label: "Site" },
  { value: "passou_na_frente", label: "Passou na frente" },
  { value: "outro", label: "Outro" },
];

export function leadSourceLabel(value: string | null | undefined) {
  if (!value) return "Não informado";
  return LEAD_SOURCES.find((s) => s.value === value)?.label ?? value;
}

/**
 * The package a head count fits in: the cheapest one whose included adults and children cover
 * everyone. When no package is big enough, the one that comes out cheapest with the extra people.
 * Null without people or packages.
 */
export function bestPackageFor<P extends PackagePricing>(packages: P[], adults: number, children: number): P | null {
  if (!packages.length || adults + children <= 0) return null;
  const total = (p: P) => Number(p.base_price) + Math.max(adults - p.included_adults, 0) * Number(p.extra_adult_price) + Math.max(children - p.included_children, 0) * Number(p.extra_child_price);
  const covering = packages.filter((p) => p.included_adults >= adults && p.included_children >= children);
  const pool = covering.length ? covering : packages;
  return [...pool].sort((a, b) => total(a) - total(b))[0];
}
