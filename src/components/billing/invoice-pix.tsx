import { CopyButton } from "@/components/ui/copy-button";
import { asaasConfigured, getPixQrCode } from "@/lib/billing/asaas";

/** Pix QR code and copy-paste code of an Asaas invoice, straight from Asaas. Nothing when there is none. */
export async function InvoicePix({ externalId }: { externalId: string | null }) {
  if (!externalId || !asaasConfigured()) return null;
  const pix = await getPixQrCode(externalId).catch(() => null);
  if (!pix?.payload) return null;
  return (
    <div className="rounded-xl bg-stone-50 border border-border p-3 flex flex-col sm:flex-row gap-3 items-center" data-testid="invoice-pix">
      {/* eslint-disable-next-line @next/next/no-img-element -- inline base64 QR from Asaas */}
      {pix.encodedImage ? <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code Pix da fatura" className="h-36 w-36" /> : null}
      <div className="min-w-0 space-y-2 text-sm">
        <p className="font-medium">Pix copia e cola</p>
        <p className="text-xs text-muted break-all line-clamp-3">{pix.payload}</p>
        <CopyButton text={pix.payload} label="Copiar código Pix" />
      </div>
    </div>
  );
}
