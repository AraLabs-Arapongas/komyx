import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatTime, toDateKey } from "@/lib/format";
import { EVENT_STATUS_LABEL, type EventStatus } from "@/lib/labels";
import { EVENT_SELECT, eventTitle, type EventRow } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors, tones } from "@/ui/theme";

/**
 * Agenda in three views: Lista (days with events), Semana (seven rows, every day shown) and Mês
 * (6×7 grid with status dots, tap a day to see it). The chosen view is remembered on the device.
 */
type ViewMode = "list" | "week" | "month";
const VIEW_KEY = "komyx.agenda.view";
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const WD_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const pill: Record<EventStatus, { bg: string; fg: string; dot: string; dashed?: boolean }> = {
  QUOTE: { bg: "#fff", fg: colors.muted, dot: "#d6d3d1", dashed: true }, PRE_RESERVED: { bg: tones.amber.bg, fg: tones.amber.fg, dot: "#fbbf24" }, CONFIRMED: { bg: tones.green.bg, fg: tones.green.fg, dot: "#10b981" },
  DONE: { bg: tones.slate.bg, fg: tones.slate.fg, dot: "#94a3b8" }, CANCELLED: { bg: tones.red.bg, fg: tones.red.fg, dot: "#f87171" }, EXPIRED: { bg: tones.zinc.bg, fg: tones.zinc.fg, dot: "#d6d3d1" },
};

const dayKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
const parse = (key: string) => new Date(`${key}T12:00:00Z`);
const addDays = (key: string, n: number) => dayKey(new Date(parse(key).getTime() + n * 86_400_000));
const weekStart = (key: string) => addDays(key, -parse(key).getUTCDay()); // Sunday
const monthOf = (key: string) => key.slice(0, 7);
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
/** 42 cells (6 weeks) starting on the Sunday before the 1st, like the web month view. */
function monthCells(month: string) {
  const first = `${month}-01`;
  const start = weekStart(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
const localIso = (key: string, hhmm = "00:00") => new Date(`${key}T${hhmm}:00-03:00`).toISOString();

export default function Agenda() {
  const today = toDateKey(new Date());
  const [view, setView] = useState<ViewMode | null>(null);
  const [anchor, setAnchor] = useState(today); // week view: any day of the week; month/list: any day of the month
  const [selected, setSelected] = useState(today); // month view: the day whose events are listed

  useEffect(() => { AsyncStorage.getItem(VIEW_KEY).then((v) => setView(v === "week" || v === "month" ? v : "list")); }, []);
  const changeView = (v: ViewMode) => { setView(v); AsyncStorage.setItem(VIEW_KEY, v).catch(() => {}); };

  const month = monthOf(anchor);
  const range = useMemo(() => {
    if (view === "week") { const s = weekStart(anchor); return { from: s, to: addDays(s, 7) }; }
    const cells = monthCells(month); return { from: cells[0], to: addDays(cells[41], 1) };
  }, [view, anchor, month]);

  const q = useQuery({
    queryKey: ["agenda", range.from, range.to],
    enabled: view !== null,
    queryFn: async () => {
      const { data } = await supabase.from("events").select(EVENT_SELECT).gte("starts_at", localIso(range.from)).lt("starts_at", localIso(range.to)).in("status", ["QUOTE", "PRE_RESERVED", "CONFIRMED", "DONE"]).order("starts_at");
      return (data ?? []) as unknown as EventRow[];
    },
  });
  const byDay = useMemo(() => {
    const m = new Map<string, EventRow[]>();
    for (const e of q.data ?? []) { const k = toDateKey(e.starts_at); if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
    return m;
  }, [q.data]);

  if (!view) return <Loading />;
  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${MONTHS[m - 1][0].toUpperCase() + MONTHS[m - 1].slice(1)} de ${y}`;
  const ws = weekStart(anchor);
  const weekLabel = `${ws.slice(8)}/${ws.slice(5, 7)} – ${addDays(ws, 6).slice(8)}/${addDays(ws, 6).slice(5, 7)}`;
  const prev = () => setAnchor(view === "week" ? addDays(anchor, -7) : `${shiftMonth(month, -1)}-01`);
  const next = () => setAnchor(view === "week" ? addDays(anchor, 7) : `${shiftMonth(month, 1)}-01`);
  const goToday = () => { setAnchor(today); setSelected(today); };

  const EventChip = ({ e, compact }: { e: EventRow; compact?: boolean }) => {
    const p = pill[e.status];
    return (
      <Pressable onPress={() => router.push({ pathname: "/(app)/eventos/[id]", params: { id: e.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, borderStyle: p.dashed ? "dashed" : "solid", borderColor: p.dashed ? "#d6d3d1" : p.bg, backgroundColor: p.bg, paddingHorizontal: 10, paddingVertical: compact ? 6 : 10 }}>
        <Text style={{ fontSize: 12, color: p.fg, fontVariant: ["tabular-nums"] }}>{formatTime(e.starts_at)}{compact ? "" : `–${formatTime(e.ends_at)}`}</Text>
        <Text style={{ flex: 1, fontWeight: "600", color: p.fg, fontSize: compact ? 13 : 15 }} numberOfLines={1}>{eventTitle(e)}</Text>
        {!compact ? <Text style={{ fontSize: 12, color: p.fg, opacity: 0.8 }}>{(e.adults ?? 0) + (e.children ?? 0)} pes.</Text> : null}
      </Pressable>
    );
  };

  const listDays = [...byDay.keys()].filter((k) => monthOf(k) === month).sort();

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {/* View switch */}
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: colors.border }}>
          {([["list", "Lista"], ["week", "Semana"], ["month", "Mês"]] as [ViewMode, string][]).map(([v, label]) => (
            <Pressable key={v} onPress={() => changeView(v)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: view === v ? colors.brand : "transparent" }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: view === v ? "#fff" : colors.muted }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={goToday} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}><Text style={{ fontSize: 13, fontWeight: "600" }}>Hoje</Text></Pressable>
      </Row>

      {/* Period nav */}
      <Row style={{ justifyContent: "space-between" }}>
        <Pressable onPress={prev} style={{ padding: 8 }}><Ionicons name="chevron-back" size={22} color={colors.foreground} /></Pressable>
        <Text style={styles.h3}>{view === "week" ? `${weekLabel} · ${monthLabel.split(" de ")[0]}` : monthLabel}</Text>
        <Pressable onPress={next} style={{ padding: 8 }}><Ionicons name="chevron-forward" size={22} color={colors.foreground} /></Pressable>
      </Row>

      {q.isLoading ? <Loading /> : null}

      {/* LISTA */}
      {view === "list" && !q.isLoading ? (
        listDays.length === 0 ? <Empty title="Nenhum evento neste mês" description="Orçamentos e reservas aparecem aqui." /> : listDays.map((day) => (
          <View key={day} style={{ gap: 6 }}>
            <Text style={[styles.h3, day === today && { color: colors.brand }]}>{WD[parse(day).getUTCDay()]}, {day.slice(8)}/{day.slice(5, 7)}{day === today ? " · hoje" : ""}</Text>
            {byDay.get(day)!.map((e) => <EventChip key={e.id} e={e} />)}
          </View>
        ))
      ) : null}

      {/* SEMANA: seven rows */}
      {view === "week" && !q.isLoading ? (
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" }}>
          {Array.from({ length: 7 }, (_, i) => addDays(ws, i)).map((day, i) => {
            const evs = byDay.get(day) ?? [];
            const isToday = day === today;
            return (
              <View key={day} style={{ flexDirection: "row", gap: 10, padding: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, backgroundColor: isToday ? colors.brandSoft : "transparent" }}>
                <View style={{ width: 44, alignItems: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", color: isToday ? colors.brand : colors.muted }}>{WD[i]}</Text>
                  <Text style={{ fontSize: 20, fontWeight: "800", color: isToday ? colors.brand : colors.foreground }}>{Number(day.slice(8))}</Text>
                </View>
                <View style={{ flex: 1, gap: 6, justifyContent: "center" }}>
                  {evs.length === 0 ? <Muted style={{ fontSize: 12 }}>livre</Muted> : evs.map((e) => <EventChip key={e.id} e={e} compact />)}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* MÊS: 6×7 grid + selected day */}
      {view === "month" && !q.isLoading ? (
        <>
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 8 }}>
            <View style={{ flexDirection: "row" }}>{WD.map((w) => <Text key={w} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: "700", textTransform: "uppercase", color: colors.muted }}>{w}</Text>)}</View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {monthCells(month).map((day) => {
                const inMonth = monthOf(day) === month; const evs = byDay.get(day) ?? []; const sel = day === selected; const isToday = day === today;
                return (
                  <Pressable key={day} onPress={() => setSelected(day)} style={{ width: `${100 / 7}%`, height: 50, alignItems: "center", paddingTop: 4 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.brand : isToday ? colors.brandSoft : "transparent" }}>
                      <Text style={{ fontWeight: isToday || sel ? "800" : "500", color: sel ? "#fff" : !inMonth ? colors.border : isToday ? colors.brand : colors.foreground }}>{Number(day.slice(8))}</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 3, marginTop: 3, height: 6 }}>
                      {evs.slice(0, 3).map((e) => <View key={e.id} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: pill[e.status].dot }} />)}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={[styles.h3, selected === today && { color: colors.brand }]}>{WD_FULL[parse(selected).getUTCDay()]}, {selected.slice(8)}/{selected.slice(5, 7)}{selected === today ? " · hoje" : ""}</Text>
            {(byDay.get(selected) ?? []).length === 0 ? (
              <Pressable onPress={() => router.push({ pathname: "/(app)/novo-orcamento" })} style={{ borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, padding: 14, alignItems: "center" }}>
                <Muted>Dia livre · toque para montar um orçamento</Muted>
              </Pressable>
            ) : (byDay.get(selected) ?? []).map((e) => <EventChip key={e.id} e={e} />)}
          </View>
        </>
      ) : null}

      <Row style={{ flexWrap: "wrap", gap: 10 }}>
        {(["QUOTE", "PRE_RESERVED", "CONFIRMED", "DONE"] as EventStatus[]).map((s) => (
          <Row key={s} style={{ gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pill[s].dot }} /><Muted style={{ fontSize: 11 }}>{EVENT_STATUS_LABEL[s]}</Muted></Row>
        ))}
      </Row>
    </Screen>
  );
}
