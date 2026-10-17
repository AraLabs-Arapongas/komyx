export const TZ = "America/Sao_Paulo";

export function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...opts }).format(new Date(value));
}

export function formatDateLong(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short" }).format(new Date(value));
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function formatDateTime(value: string | Date) {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** YYYY-MM-DD in São Paulo time. */
export function toDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function normalizePhone(input: string) {
  return input.replace(/\D/g, "");
}

export function formatPhone(digits: string) {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function whatsappUrl(phone: string, message?: string) {
  const d = phone.replace(/\D/g, "");
  const full = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${full}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function hoursLeft(iso: string | null | undefined) {
  if (!iso) return null;
  return Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000));
}

/** Live mask for the sign-in field: digits become (DD) 9XXXX-XXXX while typing; anything with letters or @ stays as typed. */
export function maskPhoneInput(value: string) {
  if (/[a-zA-Z@]/.test(value)) return value;
  let d = value.replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Age turned on `on` by someone born on `birth` (both YYYY-MM-DD); "" when either is missing or the birth is later. */
export function ageOn(birth: string | null | undefined, on: string | null | undefined) {
  if (!birth || !on || birth > on) return "";
  const [by, bm, bd] = birth.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return String(y - by - (m < bm || (m === bm && d < bd) ? 1 : 0));
}

const DDDS = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99]);

/** A real Brazilian number: existing DDD + mobile (9 + 8 digits) or landline (2–5 + 7 digits). A leading 55 is allowed. Same rule as the web. */
export function isValidPhone(input: string) {
  let d = normalizePhone(input);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (!DDDS.has(Number(d.slice(0, 2)))) return false;
  if (d.length === 11) return d[2] === "9";
  if (d.length === 10) return "2345".includes(d[2]);
  return false;
}
