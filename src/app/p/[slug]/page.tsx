import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Camera, MessageCircle, Check, Star, Navigation } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, whatsappLink } from "@/lib/utils";
import { BuffetHero } from "@/components/public/hero/hero";
import { PolaroidGallery, type GalleryItem } from "@/components/public/polaroid-gallery";
import { PublicFooter } from "@/components/public/public-footer";
import { RequestForm } from "./request-form";
import { resolveTheme, themeStyle } from "@/lib/theme";
import { resolveHeroStyle } from "@/lib/hero";
import { OG_IMAGE, SITE_NAME } from "@/lib/seo";

type Testimonial = { name: string; text: string };

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("name, tagline, description, cover_url").eq("slug", slug).neq("kind", "platform").eq("public_page", true).maybeSingle();
  const title = org ? `${org.name}` : "Buffet";
  const description = org?.tagline ?? org?.description ?? undefined;
  // Self canonical without ?src= (tracking param from Instagram/WhatsApp links); the buffet's cover is its share image.
  const path = `/p/${slug}`;
  const images = org?.cover_url ? [org.cover_url] : [OG_IMAGE];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "pt_BR", url: path, title, description, images },
    twitter: { card: "summary_large_image", title, description, images: org?.cover_url ? [org.cover_url] : [OG_IMAGE.url] },
  };
}

function splitFeatures(text: string | null) {
  if (!text) return [];
  return text.split(/\s*[,+;]\s*|\s+e\s+(?=[A-Za-zÀ-ú])/).map((s) => s.trim().replace(/\.$/, "")).filter((s) => s.length > 2).slice(0, 6);
}

export default async function PublicBuffetPage({ params, searchParams }: PageProps<"/p/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const src = typeof sp.src === "string" ? sp.src : typeof sp.utm_source === "string" ? sp.utm_source : "";
  const q = src ? `?src=${encodeURIComponent(src)}` : "";
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, slug, logo_url, cover_url, cover_caption, whatsapp, address, instagram, description, tagline, highlights, gallery, testimonials, founded_year, capacity, plan, theme, hero_style, show_prices_public, status, is_demo")
    .eq("slug", slug)
    .neq("kind", "platform").eq("public_page", true) // the Komyx platform org holds the admins, it is not a buffet; public_page = false hides a buffet (e.g. the App Store review demo)
    .maybeSingle();
  if (!org || org.status !== "active") notFound();
  const { data: packages } = await admin.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description").eq("organization_id", org.id).eq("active", true).order("sort_order").order("name");

  const gallery = (Array.isArray(org.gallery) ? org.gallery : []) as GalleryItem[];
  const testimonials = (Array.isArray(org.testimonials) ? org.testimonials : []) as Testimonial[];
  const highlights = org.highlights ?? [];
  const featuredIndex = packages && packages.length >= 3 ? 1 : packages && packages.length === 2 ? 1 : 0;
  const mapsUrl = org.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address)}` : null;
  // Map embed needs no API key; Waze for the "como chegar" crowd.
  const mapEmbedUrl = org.address ? `https://maps.google.com/maps?q=${encodeURIComponent(org.address)}&z=16&output=embed` : null;
  const wazeUrl = org.address ? `https://waze.com/ul?q=${encodeURIComponent(org.address)}&navigate=yes` : null;
  const waUrl = org.whatsapp ? whatsappLink(org.whatsapp, `Olá! Vi a página do ${org.name} e quero saber sobre datas e valores.`) : null;
  const theme = resolveTheme(org.plan, org.theme);
  const showPrices = org.show_prices_public;

  return (
    <main className={`flex-1 font-${theme.font}`} style={themeStyle(theme)}>
      {/* HERO: the invitation, in the style the buffet picked */}
      <BuffetHero style={resolveHeroStyle(org.hero_style)} org={org} gallery={gallery} packages={packages ?? []} waUrl={waUrl} q={q} />

      {waUrl ? (
        <a href={waUrl} target="_blank" rel="noopener" aria-label="Falar no WhatsApp" className="md:hidden fixed bottom-4 right-4 z-30 h-14 w-14 rounded-full grid place-items-center shadow-lg" style={{ background: "#25D366", color: "#fff" }}>
          <MessageCircle className="h-7 w-7" />
        </a>
      ) : null}

      {/* HIGHLIGHTS */}
      {highlights.length ? (
        <section className="mx-auto max-w-5xl px-4 py-8">
          <ul className="flex flex-wrap gap-2">
            {highlights.map((h) => (
              <li key={h} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold" style={{ background: "var(--paper-2)", color: "var(--ink)" }}>
                <Check className="h-4 w-4" style={{ color: "var(--mint)" }} /> {h}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* GALLERY */}
      {gallery.length ? (
        <section className="mx-auto max-w-5xl px-4 py-6">
          <h2 className="display font-extrabold text-3xl sm:text-4xl mb-2">Como é a festa aqui</h2>
          <p className="mb-2" style={{ color: "var(--muted-ink)" }}>Fotos de festas reais no nosso espaço.</p>
          <PolaroidGallery items={gallery} />
        </section>
      ) : null}

      {/* PACKAGES */}
      {packages && packages.length ? (
        <section className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="display font-extrabold text-3xl sm:text-4xl">Escolha o tamanho da festa</h2>
          <p className="mt-1 mb-8" style={{ color: "var(--muted-ink)" }}>{showPrices ? "Cada pacote já inclui um número de adultos e crianças. Passou disso, cobramos só o extra." : "Cada pacote já inclui um número de adultos e crianças. Monte o orçamento e enviamos o valor no WhatsApp."}</p>
          <div className="grid gap-5 md:grid-cols-3 md:items-stretch">
            {packages.map((p, i) => {
              const featured = i === featuredIndex;
              const features = splitFeatures(p.description);
              return (
                <article key={p.id} className="relative flex flex-col rounded-3xl p-6 border-2" style={{ borderColor: featured ? "var(--berry)" : "#ece7dc", background: featured ? "#fff" : "var(--paper)", boxShadow: featured ? "0 20px 50px rgba(232,53,109,0.18)" : "none" }}>
                  {featured ? <span className="absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: "var(--ink)" }}>Mais escolhido</span> : null}
                  <h3 className="display font-bold text-2xl">{p.name}</h3>
                  {showPrices ? <p className="display font-extrabold text-4xl mt-2" style={{ color: featured ? "var(--berry)" : "var(--ink)" }}>{formatCurrency(p.base_price)}</p> : <p className="display font-bold text-xl mt-2" style={{ color: "var(--muted-ink)" }}>Valor sob consulta</p>}
                  <p className="mt-3 text-sm font-bold">
                    <span className="display text-xl">{p.included_adults}</span> adultos + <span className="display text-xl">{p.included_children}</span> crianças
                  </p>
                  {showPrices ? <p className="text-xs" style={{ color: "var(--muted-ink)" }}>extra: {formatCurrency(p.extra_adult_price)} por adulto · {formatCurrency(p.extra_child_price)} por criança</p> : null}
                  {features.length ? (
                    <ul className="mt-4 space-y-1.5 text-sm flex-1">
                      {features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--mint)" }} /><span>{f}</span></li>)}
                    </ul>
                  ) : <div className="flex-1" />}
                  <Link href={`/p/${org.slug}/orcamento?package=${p.id}${src ? `&src=${encodeURIComponent(src)}` : ""}`} className="mt-6 inline-flex items-center justify-center h-12 rounded-full font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--berry)]" style={featured ? { background: "var(--berry)", color: "#fff" } : { background: "var(--ink)", color: "#fff" }}>
                    Simular com {p.name.replace(/^Pacote\s+/i, "")}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* HOW IT WORKS: a real sequence */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="display font-extrabold text-3xl sm:text-4xl mb-6">Do orçamento ao parabéns</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {[
            ["Monte o orçamento", "Escolha pacote, data, quantidade de pessoas e adicionais. O valor aparece na hora."],
            ["A gente confirma a data", "Respondemos pelo WhatsApp, seguramos a data e enviamos contrato e Pix do sinal."],
            ["Você só chega e curte", "Convite digital, lista de convidados e equipe cuidando de tudo no dia."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-3xl p-5" style={{ background: "var(--paper-2)" }}>
              <span className="display font-extrabold text-3xl" style={{ color: ["var(--berry)", "var(--sky)", "var(--mint)"][i] }}>{i + 1}</span>
              <h3 className="display font-bold text-xl mt-1">{title}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-ink)" }}>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length ? (
        <section className="mx-auto max-w-5xl px-4 py-6">
          <h2 className="display font-extrabold text-3xl sm:text-4xl mb-6">Quem já fez festa aqui</h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <li key={t.name} className="rounded-3xl p-5 bg-white border" style={{ borderColor: "#ece7dc" }}>
                <div className="flex gap-0.5 mb-2" aria-label="5 estrelas">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4" fill="var(--sun)" stroke="var(--sun)" />)}</div>
                <p className="text-sm/relaxed">“{t.text}”</p>
                <p className="mt-3 text-xs font-extrabold uppercase tracking-wide" style={{ color: "var(--muted-ink)" }}>{t.name}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* WHERE: map + directions */}
      {mapEmbedUrl ? (
        <section className="mx-auto max-w-5xl px-4 mt-14">
          <h2 className="display font-extrabold text-3xl sm:text-4xl mb-6">Onde fica</h2>
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div className="overflow-hidden rounded-3xl border bg-white shadow-[0_12px_40px_rgba(27,31,58,0.12)]" style={{ borderColor: "#ece7dc" }}>
              <iframe src={mapEmbedUrl} title={`Mapa: ${org.name}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block h-72 w-full sm:h-80 border-0" />
            </div>
            <div className="space-y-4">
              <p className="flex items-start gap-2 text-lg/snug font-bold"><MapPin className="mt-1 h-5 w-5 shrink-0" style={{ color: "var(--berry)" }} /> {org.address}</p>
              <div className="flex flex-wrap gap-3">
                <a href={mapsUrl!} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 rounded-full px-5 font-extrabold text-white" style={{ background: "var(--berry)" }}><Navigation className="h-4 w-4" /> Como chegar</a>
                <a href={wazeUrl!} target="_blank" rel="noopener" className="inline-flex h-12 items-center rounded-full px-5 font-bold" style={{ color: "var(--ink)", boxShadow: "inset 0 0 0 2px #e4ddcf" }}>Abrir no Waze</a>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* CONTACT: the invitation card */}
      <section className="mt-10" style={{ background: "var(--ink)" }}>
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-16 grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div style={{ color: "var(--paper)" }}>
            <h2 className="display font-extrabold text-3xl sm:text-4xl">Prefere falar com a gente?</h2>
            <p className="mt-3" style={{ color: "#cfd2e6" }}>Deixe seu contato e respondemos pelo WhatsApp com datas livres e valores.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {mapsUrl ? <li><a href={mapsUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 underline-offset-4 hover:underline"><MapPin className="h-4 w-4" style={{ color: "var(--sun)" }} /> {org.address}</a></li> : null}
              {org.instagram ? <li><a href={`https://instagram.com/${org.instagram}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 underline-offset-4 hover:underline"><Camera className="h-4 w-4" style={{ color: "var(--sun)" }} /> @{org.instagram}</a></li> : null}
              {waUrl ? <li><a href={waUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 underline-offset-4 hover:underline"><MessageCircle className="h-4 w-4" style={{ color: "var(--sun)" }} /> WhatsApp</a></li> : null}
            </ul>
          </div>
          <div className="scallop rounded-b-3xl pt-8 px-5 pb-6 sm:px-8">
            <p className="display font-extrabold text-2xl mb-4" style={{ color: "var(--ink)" }}>Pedir contato</p>
            <RequestForm slug={org.slug} defaultSource={src} />
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4"><hr style={{ borderColor: "rgba(255,255,255,0.12)" }} /></div>
        <PublicFooter orgName={org.name} />
      </section>
    </main>
  );
}
