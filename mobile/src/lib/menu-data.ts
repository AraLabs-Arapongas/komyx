import { menuView, type MenuGroup, type MenuPick, type MenuView } from "./menu";
import { supabase } from "./supabase";

/** Menu groups (active items) of the given packages. */
export async function loadMenuGroups(packageIds: string[]): Promise<MenuGroup[]> {
  if (!packageIds.length) return [];
  const { data } = await supabase.from("package_menu_groups").select("id, package_id, name, choose_count, sort_order, package_menu_items(id, name, description, sort_order, active)").in("package_id", packageIds).order("sort_order").order("name");
  return (data ?? []).map((g) => ({
    id: g.id, package_id: g.package_id, name: g.name, choose_count: g.choose_count, sort_order: g.sort_order,
    items: [...(g.package_menu_items as MenuGroup["items"])].filter((i) => i.active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
  }));
}

/** The menu a quote includes (groups of its package + its picks). */
export async function loadQuoteMenu(quoteId: string, packageId: string | null): Promise<MenuView[]> {
  if (!packageId) return [];
  const [groups, { data: picks }] = await Promise.all([loadMenuGroups([packageId]), supabase.from("quote_menu_choices").select("item_id").eq("quote_id", quoteId)]);
  return groups.length ? menuView(groups, (picks ?? []).map((p) => p.item_id)) : [];
}

/** Writes the picks of a new quote (only items of its package, trimmed to each group's limit). */
export async function saveQuoteMenuChoices(orgId: string, quoteId: string, groups: MenuGroup[], picks: MenuPick[]) {
  const rows: { organization_id: string; quote_id: string; group_id: string; item_id: string }[] = [];
  for (const g of groups) {
    if (g.choose_count == null) continue;
    const wanted = picks.find((p) => p.group_id === g.id)?.item_ids ?? [];
    for (const i of g.items.filter((i) => wanted.includes(i.id)).slice(0, g.choose_count)) rows.push({ organization_id: orgId, quote_id: quoteId, group_id: g.id, item_id: i.id });
  }
  if (rows.length) {
    const { error } = await supabase.from("quote_menu_choices").insert(rows);
    if (error) throw new Error(error.message);
  }
}
