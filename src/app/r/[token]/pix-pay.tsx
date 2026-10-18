"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";
import { BadgeCheck, MessageCircle } from "lucide-react";
import { buildPixPayload } from "@/lib/pix";
import { formatCurrency } from "@/lib/utils";
import { CopyButton } from "@/components/ui/copy-button";
import { buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { notifyPayment } from "./actions";

/** pt-BR money mask: typed digits fill from the cents ("50000" → "500,00"). */
export function maskMoney(v: string) {
  const d = v.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9);
  return d ? (Number(d) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}
export const parseMoney = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
const toInput = (n: number | null | undefined) => (n && n > 0 ? maskMoney(n.toFixed(2)) : "");

type Pix = { key: string; merchantName: string; merchantCity: string; txid: string; description: string };

/**
 * Pix block of the client page: QR + copy-paste for the suggested amount, "Pagar outro valor" (same key
 * and txid, any amount from R$ 1 up to what is still owed) and "Já paguei" with the amount actually paid.
 */
export function PixPay({ token, orgName, pix, label, suggested, payload, qr, max, showPrices, noticePending, waBuffet }: {
  token: string; orgName: string; pix: Pix; label: string; suggested: number | null; payload: string; qr: string | null;
  max: number; showPrices: boolean; noticePending: boolean; waBuffet: string | null;
}) {
  const [custom, setCustom] = useState<number | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState("");
  const [customQr, setCustomQr] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [paid, setPaid] = useState("");
  const [state, action] = useActionState(notifyPayment, undefined);

  const amount = custom ?? suggested;
  const code = custom ? buildPixPayload({ ...pix, amount: custom }) : payload;
  useEffect(() => {
    if (!custom) return;
    let live = true;
    QRCode.toString(code, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M" })
      .then((svg) => { if (live) setCustomQr(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`); })
      .catch(() => { if (live) setCustomQr(null); });
    return () => { live = false; };
  }, [custom, code]);

  const otherValue = parseMoney(other);
  const otherError = other && otherValue < 1 ? "Mínimo R$ 1,00." : other && otherValue > max ? `Máximo ${formatCurrency(max)} (o que falta pagar).` : null;
  const paidValue = parseMoney(paid);
  const paidError = paid && paidValue < 1 ? "Mínimo R$ 1,00." : paid && max > 0 && paidValue > max ? `Passa do que falta pagar (${formatCurrency(max)}).` : null;
  const shownQr = custom ? customQr : qr;
  const sent = state?.ok === true;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[150px_1fr] sm:items-start">
        {shownQr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownQr} alt={`QR Code Pix${amount && showPrices ? ` de ${formatCurrency(amount)}` : ""}`} className="h-[150px] w-[150px] rounded-xl bg-white p-1 border" style={{ borderColor: "#ece7dc" }} />
        ) : null}
        <div className="space-y-2 text-sm">
          <p>{label} para <b>{orgName}</b>{amount && showPrices ? <> · <b data-testid="pix-amount">{formatCurrency(amount)}</b></> : null}</p>
          <p className="flex flex-wrap items-center gap-2">Chave: <code className="rounded bg-white px-1.5 py-0.5">{pix.key}</code> <CopyButton text={pix.key} label="Copiar chave" /></p>
          <p className="flex flex-wrap items-center gap-2">Pix copia e cola <CopyButton text={code} label="Copiar código" /></p>
          <p className="text-xs rounded-lg px-2.5 py-1.5 bg-white">Código da reserva: <b>{pix.txid}</b>. Vai no identificador do Pix; se pagar manualmente, escreva na descrição.</p>
          {waBuffet ? <a href={waBuffet} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full px-4 font-extrabold text-white" style={{ background: "var(--berry)" }}><MessageCircle className="h-4 w-4" /> Enviar comprovante</a> : null}
        </div>
      </div>

      {showPrices && max >= 1 ? (
        custom ? (
          <button type="button" className="text-sm underline" style={{ color: "var(--muted-ink)" }} onClick={() => { setCustom(null); setCustomQr(null); setOther(""); }}>
            Voltar ao valor sugerido{suggested ? ` (${formatCurrency(suggested)})` : ""}
          </button>
        ) : otherOpen ? (
          <form className="rounded-2xl bg-white p-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (otherValue >= 1 && otherValue <= max) { setCustom(otherValue); setOtherOpen(false); setPaid(maskMoney(otherValue.toFixed(2))); } }}>
            <Field label="Quanto você quer pagar agora?" htmlFor="other_amount" hint={`De R$ 1,00 até ${formatCurrency(max)}. Bom para dividir o pagamento.`} error={otherError ?? undefined}>
              <Input id="other_amount" inputMode="numeric" placeholder="0,00" value={other} onChange={(e) => setOther(maskMoney(e.target.value))} autoFocus />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={buttonClass("primary", "sm")} disabled={!other || Boolean(otherError)}>Gerar Pix</button>
              <button type="button" className={buttonClass("ghost", "sm")} onClick={() => { setOtherOpen(false); setOther(""); }}>Cancelar</button>
            </div>
          </form>
        ) : (
          <button type="button" className={buttonClass("outline", "sm")} onClick={() => setOtherOpen(true)}>Pagar outro valor</button>
        )
      ) : null}

      {sent ? (
        <Alert tone="success"><BadgeCheck className="mr-1 inline h-4 w-4" />{state.message}</Alert>
      ) : noticePending ? (
        <Alert tone="info">Você já avisou um pagamento. O buffet confirma assim que vir o Pix no extrato.</Alert>
      ) : noticeOpen ? (
        <form action={action} className="rounded-2xl bg-white p-3 space-y-2">
          {state && !state.ok ? <Alert>{state.error}</Alert> : null}
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="amount" value={paidValue} />
          <Field label="Quanto você pagou?" htmlFor="paid_amount" hint="O buffet confere no extrato e registra." error={paidError ?? undefined}>
            <Input id="paid_amount" inputMode="numeric" placeholder="0,00" value={paid} onChange={(e) => setPaid(maskMoney(e.target.value))} autoFocus />
          </Field>
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingText="Enviando..." disabled={!paid || Boolean(paidError)}>Avisar o buffet</SubmitButton>
            <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setNoticeOpen(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button type="button" className={buttonClass("outline", "sm")} onClick={() => { setPaid((v) => v || (showPrices ? toInput(amount) : "")); setNoticeOpen(true); }}>Já paguei, avisar o buffet</button>
      )}
    </div>
  );
}
