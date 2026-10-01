/**
 * Pix "copia e cola" (BR Code / EMV MPM) payload builder.
 * Static QR with amount: works with any Pix key configured by the buffet owner.
 */
function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function ascii(input: string, max: number) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, max) || "N/A";
}

/** Keys: CPF/CNPJ digits, phone (+55...), e-mail or random key. Returns the raw key normalized. */
export function normalizePixKey(key: string) {
  const k = key.trim();
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(k)) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  const digits = k.replace(/\D/g, "");
  if (digits.length === 11 && /^\d{11}$/.test(digits) && !/^(\+?55)/.test(k)) return digits; // CPF
  if (digits.length === 14) return digits; // CNPJ
  if (digits.length >= 10 && digits.length <= 13) return `+${digits.startsWith("55") ? digits : `55${digits}`}`; // phone
  return k;
}

export function buildPixPayload(opts: { key: string; merchantName: string; merchantCity: string; amount?: number | null; txid?: string; description?: string }) {
  const key = normalizePixKey(opts.key);
  const gui = tlv("00", "br.gov.bcb.pix") + tlv("01", key) + (opts.description ? tlv("02", ascii(opts.description, 40)) : "");
  const txid = ascii((opts.txid ?? "***").replace(/[^A-Za-z0-9]/g, ""), 25) || "***";
  let payload =
    tlv("00", "01") +
    tlv("26", gui) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (opts.amount && opts.amount > 0 ? tlv("54", opts.amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", ascii(opts.merchantName, 25)) +
    tlv("60", ascii(opts.merchantCity, 15)) +
    tlv("62", tlv("05", txid)) +
    "6304";
  payload += crc16(payload);
  return payload;
}
