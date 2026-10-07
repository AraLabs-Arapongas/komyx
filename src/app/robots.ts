import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE_URL } from "@/lib/seo";

/** Private areas of the app (login-only) and per-customer token links. */
const PRIVATE = [
  "/api/", "/auth/", "/admin", "/login", "/signup", "/cancelada", "/suspenso",
  "/home", "/agenda", "/aniversariantes", "/clientes", "/configuracoes", "/conta", "/eventos",
  "/menu", "/notificacoes", "/orcamentos", "/pacotes", "/solicitacoes",
  "/c/", "/d/", "/g/", "/i/", "/o/", "/q/", "/r/",
];

/** Production allows the public site and blocks the app; previews block everything. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: IS_INDEXABLE ? { userAgent: "*", allow: "/", disallow: PRIVATE } : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
