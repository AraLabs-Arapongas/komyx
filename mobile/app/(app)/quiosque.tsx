import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useAuth } from "@/lib/auth";
import { formatDateLong, formatTime, toDateKey } from "@/lib/format";
import { Kiosk, setKioskEnabled, useKioskSettings } from "@/lib/kiosk";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Button, Loading, Muted, styles } from "@/ui/components";
import { PinModal } from "@/ui/pin-modal";
import { colors } from "@/ui/theme";

type TodayEvent = { id: string; title: string | null; starts_at: string; ends_at: string; status: string; celebrant_name: string | null };

/**
 * Tablet mode: the door board of today's party, full screen, nothing else reachable. The owner
 * leaves (or opens her screens) only with the kiosk PIN. On Android dev builds the app is also
 * pinned with lock-task, so home/recents do nothing.
 */
export default function Quiosque() {
  useKeepAwake();
  const { profile, org } = useAuth();
  const { settings } = useKioskSettings();
  const [ask, setAsk] = useState<null | "owner" | "exit">(null);

  useEffect(() => {
    if (settings?.enabled) Kiosk.startLockTask();
  }, [settings?.enabled]);

  const today = useQuery({
    queryKey: ["kiosk-today", profile?.organization_id],
    enabled: Boolean(profile),
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const key = toDateKey(new Date());
      const start = `${key}T00:00:00-03:00`;
      const end = new Date(new Date(start).getTime() + 86_400_000).toISOString();
      const { data: events, error } = await supabase.from("events").select("id, title, starts_at, ends_at, status, celebrant_name").eq("organization_id", profile!.organization_id).gte("starts_at", start).lt("starts_at", end).neq("status", "CANCELLED").order("starts_at");
      if (error) throw new Error(error.message);
      const ev = (events ?? [])[0] as TodayEvent | undefined;
      if (!ev) {
        const { data: next } = await supabase.from("events").select("id, title, starts_at, ends_at, status, celebrant_name").eq("organization_id", profile!.organization_id).gte("starts_at", end).neq("status", "CANCELLED").order("starts_at").limit(1);
        return { event: null as TodayEvent | null, next: ((next ?? [])[0] as TodayEvent | undefined) ?? null, short: null as string | null };
      }
      const { data: links } = await supabase.from("public_links").select("short, type").eq("event_id", ev.id).eq("type", "CHECKIN").eq("active", true).limit(1);
      let short = links?.[0]?.short as string | undefined;
      if (!short) {
        const { data: created, error: e2 } = await supabase.from("public_links").insert({ organization_id: profile!.organization_id, event_id: ev.id, type: "CHECKIN", created_by: profile!.id }).select("short").single();
        if (e2) throw new Error(e2.message);
        short = created.short as string;
      }
      return { event: ev, next: null, short };
    },
  });

  if (!settings) return <Loading />;

  const bar = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#1b1f3a" }}>
      <Ionicons name="balloon-outline" size={20} color="#ffc43d" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontWeight: "800" }} numberOfLines={1}>{org?.name ?? "Komyx"} · Portaria</Text>
        <Text style={{ color: "#cfd2e6", fontSize: 12 }} numberOfLines={1}>{today.data?.event ? `${today.data.event.title ?? "Festa"} · ${formatTime(today.data.event.starts_at)}–${formatTime(today.data.event.ends_at)}` : "Sem festa hoje"}</Text>
      </View>
      <Pressable onPress={() => today.refetch()} hitSlop={8} style={{ padding: 6 }}><Ionicons name="refresh" size={20} color="#cfd2e6" /></Pressable>
      <Pressable onPress={() => setAsk("owner")} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }}><Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Sou a dona</Text></Pressable>
      <Pressable onPress={() => setAsk("exit")} hitSlop={8} style={{ padding: 6 }}><Ionicons name="lock-open-outline" size={20} color="#cfd2e6" /></Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar hidden />
      {bar}
      {today.isLoading ? <Loading /> : today.data?.event && today.data.short ? (
        <WebView source={{ uri: `${WEB_URL}/o/${today.data.short}` }} style={{ flex: 1 }} startInLoadingState renderLoading={() => <Loading />} allowsBackForwardNavigationGestures={false} setSupportMultipleWindows={false} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 }}>
          <Ionicons name="calendar-clear-outline" size={48} color={colors.muted} />
          <Text style={[styles.cardTitle, { fontSize: 22 }]}>Sem festa hoje</Text>
          {today.data?.next ? <Muted>Próxima: {today.data.next.title ?? "Festa"} · {formatDateLong(today.data.next.starts_at)} às {formatTime(today.data.next.starts_at)}</Muted> : <Muted>Nenhuma festa agendada.</Muted>}
          {today.error ? <Text style={{ color: colors.red }}>{String((today.error as Error).message)}</Text> : null}
          <Button title="Atualizar" variant="outline" size="sm" onPress={() => today.refetch()} />
        </View>
      )}
      <PinModal
        visible={ask !== null}
        title={ask === "exit" ? "Sair do modo quiosque" : "Área da dona"}
        onClose={() => setAsk(null)}
        onSuccess={async () => {
          const mode = ask; setAsk(null);
          if (mode === "exit") { await setKioskEnabled(false); router.replace("/(app)/(tabs)/home"); }
          else router.replace("/(app)/(tabs)/home");
        }}
      />
    </View>
  );
}
