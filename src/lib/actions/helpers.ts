import "server-only";
import { z } from "zod";

export function zodFieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11 || v.length === 13, "WhatsApp inválido. Use DDD + número.");

export const optionalText = z.string().trim().optional().transform((v) => (v ? v : null));

export const moneySchema = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."))))
  .refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido");

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida");
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Postgres accepts any 8-4-4-4-12 hex id (seed ids are not RFC v4), so do not use z.uuid() here.
export const uuid = z.string().regex(UUID_RE, "Identificador inválido");

export function formToObject(formData: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") obj[k] = v;
  }
  return obj;
}
