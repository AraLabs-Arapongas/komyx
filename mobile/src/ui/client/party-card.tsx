import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { formatDateLong, formatTime } from "@/lib/format";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { KomyxMark } from "@/ui/brand";
import { Badge, Muted, styles } from "@/ui/components";
import { party } from "@/ui/party";
import { colors, shadow } from "@/ui/theme";

export type Party = { id: string; title: string | null; starts_at: string; ends_at: string; status: EventStatus; expires_at: string | null; adults: number | null; children: number | null; celebrant_name: string | null; customer_name: string; org_name: string; org_logo: string | null; token: string };

export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

/** One party to pick. `hero` is the big ink version with the countdown; `onDark` tunes the small card for an ink background. */
export function PartyCard({ p, hero, onDark, selected, onPress }: { p: Party; hero?: boolean; onDark?: boolean; selected?: boolean; onPress: () => void }) {
  const days = daysUntil(p.starts_at);
  const name = p.title ?? `Festa de ${p.customer_name}`;
  const status = <Badge tone={EVENT_STATUS_TONE[p.status]}>{p.status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[p.status]}</Badge>;
  if (hero) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ borderRadius: 24, overflow: "hidden", backgroundColor: onDark ? "rgba(255,255,255,0.08)" : party.ink, borderWidth: onDark ? 1.5 : 0, borderColor: selected ? party.sun : "rgba(255,255,255,0.18)", padding: 18, gap: 14, opacity: pressed ? 0.9 : 1, ...(onDark ? {} : shadow) })}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: party.sun, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>Próxima festa</Text>
          {status}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: party.berry, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 30 }}>{days > 0 ? days : days === 0 ? "Hoje" : "✓"}</Text>
            {days > 0 ? <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>{days === 1 ? "dia" : "dias"}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.4 }} numberOfLines={2}>{name}</Text>
            <Text style={{ color: "#cfd2e6", fontSize: 13, fontWeight: "600" }}>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)}–{formatTime(p.ends_at)}</Text>
            <Text style={{ color: "#cfd2e6", fontSize: 13 }}>{p.org_name}{p.adults != null ? ` · ${(p.adults ?? 0) + (p.children ?? 0)} pessoas` : ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </View>
      </Pressable>
    );
  }
  const fg = onDark ? "#fff" : colors.foreground;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: onDark ? (pressed ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)") : pressed ? colors.elevated : colors.surface, borderWidth: onDark ? 1.5 : 1, borderColor: selected ? party.sun : onDark ? "rgba(255,255,255,0.18)" : colors.border, ...(onDark ? {} : shadow) })}>
      {p.org_logo ? <Image alt="" source={{ uri: p.org_logo }} style={{ width: 44, height: 44, borderRadius: 14 }} /> : <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: onDark ? "rgba(255,255,255,0.12)" : colors.brandSoft, alignItems: "center", justifyContent: "center" }}><KomyxMark size={26} color={onDark ? party.sun : colors.brand} /></View>}
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: fg }]} numberOfLines={1}>{name}</Text>
        <Muted style={onDark ? { color: "#cfd2e6" } : undefined}>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)} · {p.org_name}</Muted>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        {status}
        {days > 0 ? <Muted style={{ fontSize: 11, color: onDark ? "#cfd2e6" : undefined }}>em {days} d</Muted> : null}
      </View>
    </Pressable>
  );
}
