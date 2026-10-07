import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Public marketing pages only. Buffet pages (/p/[slug]) stay out on purpose: they belong to each
 * customer, include demo buffets, and whether a buffet wants to be listed is the buffet's call.
 * Token links (/q, /c, /g, /i, /d, /r, /o) are private to the people who receive them.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/suporte`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
