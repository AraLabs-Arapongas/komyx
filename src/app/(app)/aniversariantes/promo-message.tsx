"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { whatsappLink } from "@/lib/utils";

/** "Enviar WhatsApp": lets the owner read and edit the message before WhatsApp opens. Nothing is sent automatically. */
export function PromoMessage({ phone, defaultMessage, celebrant }: { phone: string; defaultMessage: string; celebrant: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(defaultMessage);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Enviar WhatsApp</button>
      {open ? (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setOpen(false)}>
          <div role="dialog" aria-label={`Mensagem para ${celebrant}`} className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl bg-surface border border-border p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">Mensagem no WhatsApp</p>
              <button type="button" onClick={() => setOpen(false)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-muted">Revise o texto. O WhatsApp abre com a mensagem pronta e você decide quando enviar.</p>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setText(defaultMessage)} className={buttonClass("ghost", "sm")}>Restaurar padrão</button>
              <a href={whatsappLink(phone, text)} target="_blank" rel="noopener" onClick={() => setOpen(false)} className={buttonClass("primary", "sm")}><MessageCircle className="h-4 w-4" /> Abrir WhatsApp</a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
