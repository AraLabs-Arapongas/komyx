import Link from "next/link";
import { AlertTriangle, CreditCard } from "lucide-react";
import { getLateBilling, type Profile } from "@/lib/data/session";
import { SUPPORT_WHATSAPP } from "@/lib/billing";
import { billingDataMissing, brDate, HELP_EMAIL } from "@/lib/billing/plans";
import { cn, whatsappLink } from "@/lib/utils";

const TONE = {
  info: "bg-brand-soft border-brand/20 text-foreground",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  danger: "bg-red-50 border-red-200 text-red-800",
};

/**
 * Komyx billing strip in the owner app (docs/assinatura.md §1 and §3): missing CNPJ/CPF or WhatsApp during
 * the trial, and the late notice (yellow on days 1-8, red on day 9). Day 10 never gets here: the app is
 * the paused screen. Owners only (staff cannot read billing).
 */
export async function BillingBanner({ profile, org }: { profile: Profile; org: { status: string; is_demo: boolean; kind: string; document: string | null; whatsapp: string | null } }) {
  if (profile.role !== "owner" || org.status !== "active" || org.is_demo || org.kind !== "buffet") return null;
  const state = await getLateBilling(profile);
  if (!state) return null;
  const { bill, late } = state;
  const missing = billingDataMissing(org);
  const help = (
    <span className="block text-xs opacity-80">
      Precisa de ajuda? Fale com a gente pelo <a href={whatsappLink(SUPPORT_WHATSAPP, "Olá! Preciso de ajuda com a mensalidade do Komyx.")} target="_blank" rel="noopener" className="underline underline-offset-2">WhatsApp</a> ou <a href={`mailto:${HELP_EMAIL}`} className="underline underline-offset-2">{HELP_EMAIL}</a>
    </span>
  );

  if (late && late.day >= 1) {
    const red = late.day >= 9;
    const payUrl = late.invoice?.payment_url ?? null;
    return (
      <div role="status" data-testid="billing-banner" data-tone={red ? "red" : "yellow"} className={cn("border-b px-4 py-2.5 pr-28 md:pr-32 text-sm flex items-start gap-3", red ? TONE.danger : TONE.warning)}>
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p>
            {red ? <span className="font-semibold">Amanhã seu acesso será pausado. </span> : null}
            <span className={red ? "" : "font-semibold"}>Sua mensalidade venceu em {brDate(late.since)}.</span>
            {red ? " Pague hoje para continuar usando." : ` Pague até ${brDate(late.payBy)} para não pausar o acesso.`}
            {missing.length ? <> Complete {missing.join(" e ")} em <Link href="/configuracoes/empresa" className="font-semibold underline underline-offset-2">Configurações › Empresa</Link> para gerar a cobrança.</> : null}
          </p>
          {payUrl ? <a href={payUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"><CreditCard className="h-3.5 w-3.5" /> Pagar agora</a> : !missing.length ? <Link href="/conta#assinatura" className="font-semibold underline underline-offset-2">Pagar a mensalidade</Link> : null}
          {help}
        </div>
      </div>
    );
  }

  if (bill.status === "trial" && missing.length) {
    return (
      <div role="status" data-testid="billing-banner" data-tone="trial" className={cn("border-b px-4 py-2.5 pr-28 md:pr-32 text-sm flex items-start gap-3", TONE.info)}>
        <CreditCard className="h-4 w-4 mt-0.5 shrink-0 text-brand" />
        <p className="min-w-0 flex-1">
          Complete CNPJ/CPF e WhatsApp do buffet para continuar usando depois do teste{bill.due_at ? ` (até ${brDate(bill.due_at)})` : ""}.{" "}
          <Link href="/configuracoes/empresa" className="font-semibold text-brand underline underline-offset-2">Completar dados</Link>
        </p>
      </div>
    );
  }
  return null;
}
