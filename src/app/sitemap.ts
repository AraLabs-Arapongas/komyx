import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo";

// Rebuilt every hour so a new buffet shows up without a deploy.
export const revalidate = 3600;

/**
 * Marketing pages plus every buffet page that wants to be found: active buffets with a public page
 * and "Aparecer no Google" on. Demo buffets stay out (they are not real places). Token links
 * (/q, /c, /g, /i, /d, /r, /o) are private to the people who receive them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/suporte`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const { data } = await createAdminClient().from("organizations").select("slug, updated_at")
      .eq("kind", "buffet").eq("status", "active").eq("public_page", true).eq("seo_listed", true).eq("is_demo", false);
    for (const o of data ?? []) {
      pages.push({ url: `${SITE_URL}/p/${o.slug}`, lastModified: o.updated_at, changeFrequency: "weekly", priority: 0.8 });
    }
  } catch (e) {
    console.error("[sitemap] buffets", e);
  }
  return pages;
}
