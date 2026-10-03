"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOwner, requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { saveQuoteMenuChoices } from "@/lib/data/menu";
import { parsePicks } from "@/lib/menu";
import { uuid } from "./helpers";

const groupSchema = z.object({
  id: z.string().optional().transform((v) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : null)),
  package_id: uuid,
  name: z.string().trim().min(1, "Dê um nome ao grupo"),
  choose_mode: z.enum(["all", "n"]).default("n"),
  choose_count: z.string().optional().transform((v) => Number(v || 0)),
  sort_order: z.string().optional().transform((v) => Number(v || 0)),
  items: z.string().optional().default(""),
});

/**
 * Saves a menu group of a package and its items (one per line in the textarea). Existing items
 * keep their id when the name matches (so quotes that picked them stay valid); names that
 * disappeared are deactivated, not deleted.
 */
export async function saveMenuGroup(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", { name: parsed.error.issues[0]?.message });
  const d = parsed.data;
  const chooseCount = d.choose_mode === "all" ? null : Math.max(1, Math.floor(d.choose_count || 1));
  const names = [...new Set(d.items.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
  if (chooseCount != null && names.length && chooseCount > names.length) return fail(`O grupo tem ${names.length} itens; não dá para escolher ${chooseCount}.`, { choose_count: "Maior que a lista" });
  const profile = await requireOwner();
  const supabase = await createClient();

  let groupId = d.id;
  if (groupId) {
    const { error } = await supabase.from("package_menu_groups").update({ name: d.name, choose_count: chooseCount, sort_order: d.sort_order }).eq("id", groupId);
    if (error) return fail(translateDbError(error));
  } else {
    const { data, error } = await supabase.from("package_menu_groups").insert({ organization_id: profile.organization_id, package_id: d.package_id, name: d.name, choose_count: chooseCount, sort_order: d.sort_order }).select("id").single();
    if (error || !data) return fail(translateDbError(error));
    groupId = data.id;
  }

  const { data: existing } = await supabase.from("package_menu_items").select("id, name, active").eq("group_id", groupId);
  const byName = new Map((existing ?? []).map((i) => [i.name.toLowerCase(), i]));
  const seen = new Set<string>();
  for (const [idx, name] of names.entries()) {
    const found = byName.get(name.toLowerCase());
    if (found) {
      seen.add(found.id);
      await supabase.from("package_menu_items").update({ name, sort_order: idx, active: true }).eq("id", found.id);
    } else {
      await supabase.from("package_menu_items").insert({ organization_id: profile.organization_id, group_id: groupId, name, sort_order: idx });
    }
  }
  const gone = (existing ?? []).filter((i) => !seen.has(i.id) && i.active).map((i) => i.id);
  if (gone.length) await supabase.from("package_menu_items").update({ active: false }).in("id", gone);

  revalidatePath("/pacotes");
  return { ok: true, message: "Grupo salvo." };
}

export async function deleteMenuGroup(formData: FormData) {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  await requireOwner();
  const supabase = await createClient();
  await supabase.from("package_menu_groups").delete().eq("id", id.data);
  revalidatePath("/pacotes");
}

const quoteMenuSchema = z.object({ quote_id: uuid, event_id: uuid, package_id: z.string().optional(), menu: z.string().optional() });

/** Staff edits the picks of a quote (until it is accepted). */
export async function saveQuoteMenu(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = quoteMenuSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Dados inválidos.");
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("id, status, package_id").eq("id", parsed.data.quote_id).maybeSingle();
  if (!quote) return fail("Orçamento não encontrado.");
  if (quote.status === "ACCEPTED" || quote.status === "REJECTED") return fail("Orçamento fechado; o cardápio não muda mais por aqui.");
  await saveQuoteMenuChoices(supabase, profile.organization_id, quote.id, quote.package_id, parsePicks(parsed.data.menu));
  revalidatePath(`/eventos/${parsed.data.event_id}`);
  revalidatePath(`/eventos/${parsed.data.event_id}/orcamento`);
  return { ok: true, message: "Cardápio salvo." };
}
