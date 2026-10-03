import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { menuSummaryLines, picksStatus, togglePick, type MenuGroup, type MenuPick, type MenuView } from "@/lib/menu";
import { Muted, styles } from "./components";
import { colors } from "./theme";

/** Picks items of a package's menu: one block per group, chips to tap. */
export function MenuPicker({ groups, picks, onChange }: { groups: MenuGroup[]; picks: MenuPick[]; onChange: (p: MenuPick[]) => void }) {
  if (!groups.length) return null;
  const { missing } = picksStatus(groups, picks);
  return (
    <View style={{ gap: 10 }}>
      {groups.map((g) => {
        const chosen = picks.find((p) => p.group_id === g.id)?.item_ids ?? [];
        const remaining = g.choose_count != null ? g.choose_count - chosen.length : 0;
        return (
          <View key={g.id} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <Text style={styles.h3}>{g.name}</Text>
              {g.choose_count != null ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: remaining > 0 ? colors.sunSoft : colors.mintSoft }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: remaining > 0 ? colors.amber : colors.green }}>{remaining > 0 ? `Escolha ${g.choose_count}${remaining !== g.choose_count ? ` · faltam ${remaining}` : ""}` : `${g.choose_count} de ${g.choose_count} ✓`}</Text>
                </View>
              ) : <Muted>Tudo incluído</Muted>}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {g.items.map((i) => {
                const on = g.choose_count == null || chosen.includes(i.id);
                const pickable = g.choose_count != null;
                return (
                  <Pressable key={i.id} disabled={!pickable} onPress={() => onChange(togglePick(groups, picks, g.id, i.id))} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.brand : colors.border, backgroundColor: on ? colors.brand : colors.surface, opacity: pickable && !on && remaining <= 0 && g.choose_count !== 1 ? 0.5 : 1 }}>
                    {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    <Text style={{ fontSize: 13, fontWeight: "600", color: on ? "#fff" : colors.foreground }}>{i.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
      {missing.length ? <Muted>Dá para decidir depois: o que faltar fica marcado no orçamento.</Muted> : null}
    </View>
  );
}

/** The menu a quote includes, one line per group. */
export function MenuSummary({ view }: { view: MenuView[] }) {
  if (!view.length) return null;
  return (
    <View style={{ gap: 4 }}>
      {menuSummaryLines(view).map((l) => (
        <View key={l.name} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
          <Ionicons name="checkmark-circle" size={16} color={l.pending ? colors.amber : colors.green} style={{ marginTop: 2 }} />
          <Text style={[styles.text, { flex: 1 }]}><Text style={{ fontWeight: "700" }}>{l.name}: </Text><Text style={{ color: l.pending ? colors.amber : colors.muted }}>{l.text}{l.pending ? " (a escolher)" : ""}</Text></Text>
        </View>
      ))}
    </View>
  );
}
