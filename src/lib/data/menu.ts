import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { menuView, type MenuGroup, type MenuPick, type MenuView } from "@/lib/menu";

type Client = SupabaseClient<Database>;

/** Menu groups (with active items) of the given packages, or of the whole org when no ids. */
export async function loadMenuGroups(supabase: Client, opts: { orgId?: string; packageIds?: string[] } = {}): Promise<MenuGroup[]> {
  let q = supabase.from("package_menu_groups").select("id, package_id, name, choose_count, sort_order, package_menu_items(id, name, description, sort_order, active)").order("sort_order").order("name");
  if (opts.orgId) q = q.eq("organization_id", opts.orgId);
  if (opts.packageIds) { if (!opts.packageIds.length) return []; q = q.in("package_id", opts.packageIds); }
  const { data } = await q;
  return (data ?? []).map((g) => ({
    id: g.id, package_id: g.package_id, name: g.name, choose_count: g.choose_count, sort_order: g.sort_order,
    items: [...g.package_menu_items].filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }));
}

/** The menu a quote includes (groups of its package + its picks). Empty when the package has no menu. */
export async function loadQuoteMenu(supabase: Client, quoteId: string, packageId: string | null): Promise<MenuView[]> {
  if (!packageId) return [];
  const [groups, { data: picks }] = await Promise.all([
    loadMenuGroups(supabase, { packageIds: [packageId] }),
    supabase.from("quote_menu_choices").select("item_id").eq("quote_id", quoteId),
  ]);
  if (!groups.length) return [];
  return menuView(groups, (picks ?? []).map((p) => p.item_id));
}

/**
 * Replaces a quote's picks. Only items of the quote's package count; picks beyond a group's
 * choose_count are trimmed. Safe to call with no picks (clears).
 */
export async function saveQuoteMenuChoices(supabase: Client, orgId: string, quoteId: string, packageId: string | null, picks: MenuPick[]) {
  await supabase.from("quote_menu_choices").delete().eq("quote_id", quoteId);
  if (!packageId || !picks.length) return;
  const groups = await loadMenuGroups(supabase, { packageIds: [packageId] });
  const rows: { organization_id: string; quote_id: string; group_id: string; item_id: string }[] = [];
  for (const g of groups) {
    if (g.choose_count == null) continue;
    const wanted = picks.find((p) => p.group_id === g.id)?.item_ids ?? [];
    const valid = g.items.filter((i) => wanted.includes(i.id)).slice(0, g.choose_count);
    for (const i of valid) rows.push({ organization_id: orgId, quote_id: quoteId, group_id: g.id, item_id: i.id });
  }
  if (rows.length) await supabase.from("quote_menu_choices").insert(rows);
}
