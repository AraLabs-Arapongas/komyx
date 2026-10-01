import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatTime, toDateKey } from "@/lib/format";
import { EVENT_STATUS_LABEL, type EventStatus } from "@/lib/labels";
import { EVENT_SELECT, eventTitle, type EventRow } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors, tones } from "@/ui/theme";
import { Link } from "expo-router";

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const pill: Record<EventStatus, { bg: string; fg: string; dashed?: boolean }> = {
  QUOTE: { bg: "#fff", fg: colors.muted, dashed: true }, PRE_RESERVED: { bg: tones.amber.bg, fg: tones.amber.fg }, CONFIRMED: { bg: tones.green.bg, fg: tones.green.fg },
  DONE: { bg: tones.slate.bg, fg: tones.slate.fg }, CANCELLED: { bg: tones.red.bg, fg: tones.red.fg }, EXPIRED: { bg: tones.zinc.bg, fg: tones.zinc.fg },
};

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function Agenda() {
  const today = toDateKey(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const q = useQuery({
    queryKey: ["agenda", month],
    queryFn: async () => {
      const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const to = new Date(Date.UTC(y, m, 1)).toISOString();
      const { data } = await supabase.from("events").select(EVENT_SELECT).gte("starts_at", from).lt("starts_at", to).in("status", ["QUOTE", "PRE_RESERVED", "CONFIRMED", "DONE"]).order("starts_at");
      return (data ?? []) as unknown as EventRow[];
    },
  });
  const byDay = new Map<string, EventRow[]>();
  for (const e of q.data ?? []) {
    const k = toDateKey(e.starts_at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(e);
  }
  const days = [...byDay.keys()].sort();

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Row style={{ justifyContent: "space-between" }}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} style={{ padding: 8 }}><Ionicons name="chevron-back" size={22} color={colors.foreground} /></Pressable>
        <Text style={styles.h3}>{MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1)} de {y}</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={22} color={colors.foreground} /></Pressable>
      </Row>
      <Row style={{ flexWrap: "wrap", gap: 10 }}>
        {(["QUOTE", "PRE_RESERVED", "CONFIRMED", "DONE"] as EventStatus[]).map((s) => (
          <Row key={s} style={{ gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s === "QUOTE" ? "#d6d3d1" : s === "PRE_RESERVED" ? "#fbbf24" : s === "CONFIRMED" ? "#10b981" : "#94a3b8" }} /><Muted style={{ fontSize: 11 }}>{EVENT_STATUS_LABEL[s]}</Muted></Row>
        ))}
      </Row>
      {q.isLoading ? <Loading /> : days.length === 0 ? <Empty title="Nenhum evento neste mês" description="Orçamentos e reservas aparecem aqui." /> : days.map((day) => {
        const [, mm, dd] = day.split("-");
        const wd = WD[new Date(`${day}T12:00:00Z`).getUTCDay()];
        return (
          <View key={day} style={{ gap: 6 }}>
            <Text style={[styles.h3, day === today && { color: colors.brand }]}>{wd}, {dd}/{mm}{day === today ? " · hoje" : ""}</Text>
            {byDay.get(day)!.map((e) => {
              const p = pill[e.status];
              return (
                <Link key={e.id} href={{ pathname: "/(app)/eventos/[id]", params: { id: e.id } }} asChild>
                  <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderStyle: p.dashed ? "dashed" : "solid", borderColor: p.dashed ? "#d6d3d1" : p.bg, backgroundColor: p.bg, paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text style={{ fontSize: 12, color: p.fg, fontVariant: ["tabular-nums"] }}>{formatTime(e.starts_at)}–{formatTime(e.ends_at)}</Text>
                    <Text style={{ flex: 1, fontWeight: "600", color: p.fg }} numberOfLines={1}>{eventTitle(e)}</Text>
                    <Text style={{ fontSize: 12, color: p.fg, opacity: 0.8 }}>{(e.adults ?? 0) + (e.children ?? 0)} pes.</Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}
