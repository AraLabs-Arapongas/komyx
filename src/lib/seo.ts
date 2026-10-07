import type { Metadata } from "next";
import { BILLING_PERIODS, TABLET_PLAN_PER_MONTH, TRIAL_DAYS } from "@/lib/billing";

/**
 * SEO for the public (marketing) pages. www.komyx.com.br is the source of truth for Komyx
 * (aralabs.com.br/produtos/komyx is only a showcase that links here), so every public page
 * declares a self-referencing canonical on this host.
 */
export const SITE_URL = "https://www.komyx.com.br";
export const SITE_NAME = "Komyx";

/** Only the production deployment is indexable; previews and local builds are noindex. */
export const IS_INDEXABLE = process.env.VERCEL_ENV === "production";

/** AraLabs, the company behind Komyx. Same @id the aralabs.com.br site publishes. */
export const ARALABS = { "@type": "Organization", "@id": "https://aralabs.com.br/#organization", name: "AraLabs", url: "https://aralabs.com.br" } as const;

/**
 * Metadata for one public page: canonical + Open Graph + Twitter. Pages set `openGraph` here instead of
 * by hand because Next merges `openGraph` shallowly: a page that sets its own drops the layout's
 * site name, locale and image.
 */
export function publicPageMetadata({ title, description, path, absoluteTitle = false }: { title: string; description?: string; path: string; absoluteTitle?: boolean }): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "pt_BR", url: path, title: fullTitle, description, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [OG_IMAGE.url] },
  };
}

/** Default share image (src/app/opengraph-image.tsx). */
export const OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "Komyx, sistema para buffet infantil e de eventos" };

/** JSON-LD for the home: the product (SoftwareApplication), the site and the link to AraLabs. Prices come from lib/billing. */
export function homeJsonLd() {
  const offers = [
    ...BILLING_PERIODS.map((p) => ({
      "@type": "Offer",
      name: p.months === 1 ? "Plano mensal" : p.months === 12 ? "Plano anual" : `Plano de ${p.label}`,
      price: p.perMonth,
      priceCurrency: "BRL",
      priceSpecification: { "@type": "UnitPriceSpecification", price: p.perMonth, priceCurrency: "BRL", unitCode: "MON", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" }, billingDuration: { "@type": "QuantitativeValue", value: p.months, unitCode: "MON" } },
      url: `${SITE_URL}/#precos`,
      availability: "https://schema.org/InStock",
    })),
    {
      "@type": "Offer",
      name: "Komyx Balcão (plano anual + tablet na portaria)",
      price: TABLET_PLAN_PER_MONTH,
      priceCurrency: "BRL",
      priceSpecification: { "@type": "UnitPriceSpecification", price: TABLET_PLAN_PER_MONTH, priceCurrency: "BRL", unitCode: "MON", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" }, billingDuration: { "@type": "QuantitativeValue", value: 12, unitCode: "MON" } },
      url: `${SITE_URL}/#tablet`,
      availability: "https://schema.org/InStock",
    },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: `Sistema para buffet infantil e de eventos: orçamento online, reserva com sinal no Pix, contrato automático, convite com confirmação de presença e portaria no celular. ${TRIAL_DAYS} dias grátis.`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: "pt-BR",
        image: `${SITE_URL}${OG_IMAGE.url}`,
        offers,
        publisher: ARALABS,
        provider: ARALABS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        inLanguage: "pt-BR",
        about: { "@id": `${SITE_URL}/#software` },
        publisher: ARALABS,
      },
    ],
  };
}
