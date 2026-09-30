export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(error: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Translate common Postgres/Supabase errors into user-facing Portuguese. */
export function translateDbError(err: { message?: string; code?: string; hint?: string } | null | undefined): string {
  if (!err) return "Erro inesperado.";
  const msg = err.message ?? "";
  if (msg.includes("Horário indisponível") || err.hint === "SCHEDULE_CONFLICT") return msg;
  if (err.code === "23P01" || msg.includes("events_confirmed_no_overlap")) return "Horário indisponível: já existe um evento confirmado neste intervalo.";
  if (err.code === "23514" && msg.includes("whatsapp")) return "WhatsApp inválido. Use DDD + número (10 ou 11 dígitos).";
  if (err.code === "23514" && msg.includes("events_time_order")) return "O horário final deve ser maior que o inicial.";
  if (err.code === "23505" && msg.includes("slug")) return "Este endereço público já está em uso. Escolha outro.";
  if (err.code === "42501") return "Você não tem permissão para esta ação.";
  return msg || "Erro inesperado.";
}
