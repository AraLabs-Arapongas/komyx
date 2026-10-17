import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { toDateKey } from "@/lib/utils";
import { QuoteWizard } from "./quote-wizard";
import { resolveTheme, themeStyle } from "@/lib/theme";
import { PublicFooter } from "@/components/public/public-footer";
import { DemoBanner } from "@/components/public/demo-banner";
import { loadMenuGroups } from "@/lib/data/menu";

export const metadata = { title: "Monte seu orçamento" };

export default async function SelfServiceQuotePage({ params, searchParams }: PageProps<"/p/[slug]/orcamento">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const src = typeof sp.src === "string" ? sp.src : typeof sp.utm_source === "string" ? sp.utm_source : "";
  const preselected = typeof sp.package === "string" ? sp.package : "";
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id, name, slug, logo_url, whatsapp, default_event_duration_minutes, plan, theme, show_prices_public, self_booking_enabled, pre_reservation_validity_hours, payment_plan, status, is_demo").eq("slug", slug).neq("kind", "platform").eq("public_page", true).maybeSingle();
  if (!org || org.status !== "active") notFound();
  const [{ data: packages }, { data: addons }, { data: themes }] = await Promise.all([
    admin.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description").eq("organization_id", org.id).eq("active", true).order("sort_order").order("name"),
    admin.from("package_addons").select("id, name, price, description").eq("organization_id", org.id).eq("active", true).order("sort_order").order("name"),
    admin.from("party_themes").select("id, name, description, photo_url").eq("organization_id", org.id).eq("active", true).order("sort_order").order("name"),
  ]);

  const menuGroups = await loadMenuGroups(admin, { orgId: org.id, packageIds: (packages ?? []).map((p) => p.id) });
  const theme = resolveTheme(org.plan, org.theme);
  return (
    // At least one screen tall: on short steps the page footer sits at the bottom, never above it.
    <main className={`flex-1 flex flex-col min-h-[100svh] font-${theme.font}`} style={themeStyle(theme)}>
      {org.is_demo ? <DemoBanner /> : null}
      <div className="mx-auto w-full max-w-2xl px-4 py-4 sm:py-6 flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/p/${org.slug}`} className="h-10 w-10 grid place-items-center rounded-full bg-white border" style={{ borderColor: "#ece7dc" }} aria-label="Voltar"><ChevronLeft className="h-5 w-5" /></Link>
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : null}
            <div>
              <h1 className="display font-extrabold text-xl sm:text-2xl leading-tight">Monte seu orçamento</h1>
              <p className="text-sm" style={{ color: "var(--muted-ink)" }}>{org.name}</p>
            </div>
          </div>
        </div>
        <QuoteWizard slug={org.slug} menuGroups={menuGroups} packages={packages ?? []} addons={addons ?? []} themes={themes ?? []} defaultSource={src} preselectedPackage={preselected} today={toDateKey(new Date())} durationMinutes={org.default_event_duration_minutes} showPrices={org.show_prices_public} selfBooking={org.self_booking_enabled} validityHours={org.pre_reservation_validity_hours} depositPercent={(() => { const plan = Array.isArray(org.payment_plan) ? (org.payment_plan as { percent?: number }[]) : []; return plan[0]?.percent ?? null; })()} depositLabel={(() => { const plan = Array.isArray(org.payment_plan) ? (org.payment_plan as { label?: string }[]) : []; return plan[0]?.label ?? null; })()} />
      </div>
      <PublicFooter variant="light" orgName={org.name} />
    </main>
  );
}
