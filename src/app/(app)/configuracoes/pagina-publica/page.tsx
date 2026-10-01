import Link from "next/link";
import { ExternalLink, Lock } from "lucide-react";
import { requireOwner, getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { buttonClass } from "@/components/ui/button";
import { appUrl, cn } from "@/lib/utils";
import { resolveTheme } from "@/lib/theme";
import { PublicProfileForm, GalleryForm, ThemeForm, ImageUploadForm, CoverCaptionForm, ShowPricesForm } from "../forms";
import { UnsavedGuard } from "../unsaved-guard";

export const metadata = { title: "Página pública" };

const TABS = [["conteudo", "Conteúdo"], ["aparencia", "Aparência"], ["galeria", "Galeria"]] as const;

export default async function PublicPageSettings({ searchParams }: PageProps<"/configuracoes/pagina-publica">) {
  await requireOwner();
  const [org, sp] = await Promise.all([getOrganization(), searchParams]);
  const tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as string) : "conteudo";
  const publicUrl = appUrl(`/p/${org.slug}`);
  const premium = org.plan === "premium";

  return (
    <>
      <PageHeader title="Página pública" back="/configuracoes" action={
        <div className="flex items-center gap-2">
          <Link href={`/p/${org.slug}`} target="_blank" className={buttonClass("outline", "sm")}>Abrir página <ExternalLink className="h-3.5 w-3.5" /></Link>
          <CopyButton text={publicUrl} />
        </div>
      } />
      <PageBody>
        <UnsavedGuard>
          <Card>
            <CardHeader title="Links" subtitle="Use na bio do Instagram e em anúncios. O ?src= diz de onde veio o lead." />
            <CardBody className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2"><span><b>Página pública</b><br /><span className="text-muted break-all">{publicUrl}</span></span><CopyButton text={publicUrl} /></div>
              <div className="flex items-center justify-between gap-2"><span><b>Link da bio do Instagram</b><br /><span className="text-muted break-all">{publicUrl}?src=instagram</span></span><CopyButton text={`${publicUrl}?src=instagram`} /></div>
              <div className="flex items-center justify-between gap-2"><span><b>Link direto para orçamento</b><br /><span className="text-muted break-all">{publicUrl}/orcamento?src=instagram</span></span><CopyButton text={`${publicUrl}/orcamento?src=instagram`} /></div>
            </CardBody>
          </Card>

          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {TABS.map(([k, l]) => (
              <Link key={k} href={k === "conteudo" ? "/configuracoes/pagina-publica" : `/configuracoes/pagina-publica?tab=${k}`} className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border", tab === k ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>{l}</Link>
            ))}
          </div>

          {tab === "conteudo" ? (
            <>
              <Card>
                <CardHeader title="Conteúdo" subtitle="Frase principal, destaques, depoimentos e regras da agenda" />
                <CardBody><PublicProfileForm profile={{ tagline: org.tagline, highlights: org.highlights ?? [], testimonials: (Array.isArray(org.testimonials) ? org.testimonials : []) as { name: string; text: string }[], founded_year: org.founded_year, capacity: org.capacity, one_event_per_day: org.one_event_per_day, self_booking_enabled: org.self_booking_enabled }} /></CardBody>
              </Card>
              <Card>
                <CardHeader title="Preços" />
                <CardBody><ShowPricesForm showPrices={org.show_prices_public} /></CardBody>
              </Card>
            </>
          ) : null}

          {tab === "aparencia" ? (
            premium ? (
              <>
                <Card>
                  <CardHeader title="Cores e fonte" subtitle="Plano Premium" />
                  <CardBody><ThemeForm plan={org.plan} theme={resolveTheme(org.plan, org.theme)} /></CardBody>
                </Card>
                <Card>
                  <CardHeader title="Logo e capa" subtitle="JPG, PNG ou WebP até 5MB. O nome no topo vem de Empresa." />
                  <CardBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <ImageUploadForm kind="logo" currentUrl={org.logo_url} />
                      <ImageUploadForm kind="cover" currentUrl={org.cover_url} />
                    </div>
                    <CoverCaptionForm caption={org.cover_caption} />
                  </CardBody>
                </Card>
              </>
            ) : (
              <Card>
                <CardBody className="pt-4 flex items-start gap-3">
                  <span className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-stone-100 text-muted"><Lock className="h-5 w-5" /></span>
                  <div>
                    <p className="font-medium">Aparência é do plano Premium</p>
                    <p className="text-sm text-muted">Cores, fonte, logo e capa personalizados ficam disponíveis no Premium. Sua página usa o visual padrão do Festeja, que já converte bem.</p>
                  </div>
                </CardBody>
              </Card>
            )
          ) : null}

          {tab === "galeria" ? (
            <Card>
              <CardHeader title="Galeria" subtitle="Até 12 fotos de festas reais (JPG, PNG ou WebP até 8MB)" />
              <CardBody><GalleryForm gallery={(Array.isArray(org.gallery) ? org.gallery : []) as { url: string; caption?: string | null }[]} /></CardBody>
            </Card>
          ) : null}
        </UnsavedGuard>
      </PageBody>
    </>
  );
}
