/** Package menu (shared client + server): groups of items, how many the client picks per group. */

export type MenuItem = { id: string; name: string; description: string | null; sort_order: number; active: boolean };
export type MenuGroup = { id: string; package_id: string; name: string; choose_count: number | null; sort_order: number; items: MenuItem[] };
/** Picks for one quote: item ids per group (groups with choose_count null need no picks). */
export type MenuPick = { group_id: string; item_ids: string[] };
export type MenuView = { group_id: string; name: string; choose_count: number | null; items: { id: string; name: string; description: string | null; chosen: boolean }[] };

export const groupsForPackage = (groups: MenuGroup[], packageId: string | null) => (packageId ? groups.filter((g) => g.package_id === packageId) : []);

export function parsePicks(raw: unknown): MenuPick[] {
  const v = typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
  if (!Array.isArray(v)) return [];
  return v
    .filter((p): p is { group_id: string; item_ids: unknown } => Boolean(p) && typeof p === "object" && typeof (p as { group_id?: unknown }).group_id === "string")
    .map((p) => ({ group_id: p.group_id, item_ids: Array.isArray(p.item_ids) ? p.item_ids.filter((x): x is string => typeof x === "string") : [] }));
}

/** Groups where the client still has to pick, and groups with too many picks. */
export function picksStatus(groups: MenuGroup[], picks: MenuPick[]) {
  const missing: { group: MenuGroup; remaining: number }[] = [];
  const over: MenuGroup[] = [];
  for (const g of groups) {
    if (g.choose_count == null) continue;
    const n = picks.find((p) => p.group_id === g.id)?.item_ids.length ?? 0;
    if (n < g.choose_count) missing.push({ group: g, remaining: g.choose_count - n });
    if (n > g.choose_count) over.push(g);
  }
  return { missing, over, complete: missing.length === 0 && over.length === 0 };
}

/** Toggles one item inside a group, respecting choose_count (a full group ignores new picks). */
export function togglePick(groups: MenuGroup[], picks: MenuPick[], groupId: string, itemId: string): MenuPick[] {
  const g = groups.find((x) => x.id === groupId);
  if (!g || g.choose_count == null) return picks;
  const cur = picks.find((p) => p.group_id === groupId)?.item_ids ?? [];
  let next: string[];
  if (cur.includes(itemId)) next = cur.filter((x) => x !== itemId);
  else if (cur.length >= g.choose_count) next = g.choose_count === 1 ? [itemId] : cur;
  else next = [...cur, itemId];
  return [...picks.filter((p) => p.group_id !== groupId), { group_id: groupId, item_ids: next }];
}

/** What the quote includes, group by group, for display. */
export function menuView(groups: MenuGroup[], chosen: Iterable<string>): MenuView[] {
  const set = new Set(chosen);
  return groups.map((g) => ({
    group_id: g.id, name: g.name, choose_count: g.choose_count,
    items: g.items.filter((i) => i.active).map((i) => ({ id: i.id, name: i.name, description: i.description, chosen: g.choose_count == null || set.has(i.id) })),
  }));
}

/** One line per group: "Salgados: coxinha, kibe, esfiha". */
export function menuSummaryLines(view: MenuView[]) {
  return view.map((g) => {
    const chosen = g.items.filter((i) => i.chosen).map((i) => i.name);
    return { name: g.name, text: chosen.length ? chosen.join(", ") : g.choose_count ? `escolher ${g.choose_count}` : "—", pending: g.choose_count != null && chosen.length < g.choose_count };
  });
}
