import { MessageCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { SUPPORT_WHATSAPP } from "@/lib/billing";
import { whatsappLink } from "@/lib/utils";

export const metadata = { title: "Conta suspensa" };

export default function SuspendedPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-brand text-brand-fg grid place-items-center text-xl font-bold">F</div>
        <h1 className="text-2xl font-semibold">Conta suspensa</h1>
        <p className="text-muted">O acesso deste buffet ao Komyx está pausado. Seus dados estão guardados. Fale com o suporte para reativar.</p>
        <a href={whatsappLink(SUPPORT_WHATSAPP, "Olá, minha conta no Komyx está suspensa")} target="_blank" rel="noopener" className={buttonClass("primary", "lg")}><MessageCircle className="h-5 w-5" /> Falar com o suporte</a>
        <form action="/auth/signout" method="post"><PendingButton className="text-sm text-muted">Sair</PendingButton></form>
      </div>
    </main>
  );
}
