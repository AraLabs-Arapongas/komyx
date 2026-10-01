import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

export type OnboardingState = {
  hasPackages: boolean;
  hasPix: boolean;
  hasPhotos: boolean;
  hasWhatsapp: boolean;
  hasEvent: boolean;
  publicUrl: string;
};

/** First-week checklist. Disappears once everything is done. */
export function Onboarding({ s, isOwner }: { s: OnboardingState; isOwner: boolean }) {
  const steps = [
    { done: s.hasWhatsapp, label: "Informe o WhatsApp do buffet", href: "/configuracoes", hint: "é por ele que o cliente fala com você" },
    { done: s.hasPackages, label: "Cadastre seus pacotes", href: "/pacotes", hint: "preço, adultos e crianças inclusos" },
    { done: s.hasPix, label: "Configure a chave Pix e o prazo do sinal", href: "/configuracoes", hint: "o cliente paga o sinal sozinho" },
    { done: s.hasPhotos, label: "Suba fotos de festas", href: "/configuracoes", hint: "página com foto converte muito mais" },
    { done: s.hasEvent, label: "Crie seu primeiro orçamento", href: "/eventos/novo", hint: "ou espere a primeira reserva online" },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  if (doneCount === steps.length) return null;
  return (
    <div className="rounded-2xl border border-brand/30 bg-brand-soft/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Deixe seu buffet pronto para vender</p>
        <span className="text-xs text-muted">{doneCount}/{steps.length}</span>
      </div>
      <ol className="space-y-1.5">
        {steps.map((st) => (
          <li key={st.label}>
            <Link href={isOwner || st.href.startsWith("/eventos") ? st.href : "/menu"} className="flex items-start gap-2 text-sm">
              {st.done ? <Check className="h-4 w-4 mt-0.5 text-emerald-600" /> : <Circle className="h-4 w-4 mt-0.5 text-muted" />}
              <span className={st.done ? "line-through text-muted" : ""}>{st.label} <span className="text-muted">· {st.hint}</span></span>
            </Link>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
        <span>Link da bio:</span><span className="break-all">{s.publicUrl}?src=instagram</span><CopyButton text={`${s.publicUrl}?src=instagram`} label="Copiar" />
      </div>
    </div>
  );
}
