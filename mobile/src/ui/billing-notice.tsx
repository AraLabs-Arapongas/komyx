import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { colors } from "@/ui/theme";

const PAUSE_DAY = 10;

/** A plain YYYY-MM-DD at noon, so the São Paulo time zone never shows the day before. */
export const day = (d: string | Date) => formatDate(typeof d === "string" ? `${d}T12:00:00` : d);

/** Days between two YYYY-MM-DD dates (b − a). */
function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000);
}

/**
 * Late Komyx payment (days 1–9), owners only, as the web banner. Information only: no payment link or
 * button (App Store rules); the help contact is the way out. Day 10 is the paused screen.
 */
export function BillingNotice() {
  const { org, profile } = useAuth();
  const since = org?.billing?.lateSince;
  if (profile?.role !== "owner" || !since || org?.paused) return null;
  const today = new Date().toISOString().slice(0, 10);
  const lateDays = daysBetween(since, today);
  if (lateDays < 1) return null;
  const red = lateDays >= PAUSE_DAY - 1;
  const pauseOn = new Date(`${since}T12:00:00Z`);
  pauseOn.setUTCDate(pauseOn.getUTCDate() + PAUSE_DAY);
  return (
    <View testID="billing-notice" style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: red ? "#fecaca" : "#fde68a", backgroundColor: red ? "#fef2f2" : "#fffbeb" }}>
      <Ionicons name="alert-circle-outline" size={20} color={red ? "#b91c1c" : "#b45309"} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: "700", color: red ? "#991b1b" : "#92400e" }}>{red ? "Amanhã seu acesso será pausado" : `Mensalidade do Komyx atrasada há ${lateDays} dia${lateDays === 1 ? "" : "s"}`}</Text>
        <Text style={{ color: colors.foreground, fontSize: 13 }}>Venceu em {day(since)}. Para não pausar o acesso em {formatDate(pauseOn)}, regularize a mensalidade. Dúvidas: contato@komyx.com.br.</Text>
      </View>
    </View>
  );
}

/** Menu line for the owner: trial end, late, or next charge. */
export function billingLine(org: ReturnType<typeof useAuth>["org"]): { text: string; tone: "red" | "muted" } | null {
  const b = org?.billing;
  if (!b) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (org?.status === "cancelled") return { text: org.access_until ? `Assinatura cancelada · acesso até ${day(org.access_until)}` : "Assinatura cancelada", tone: "red" };
  if (b.lateSince) { const d = daysBetween(b.lateSince, today); return { text: `Mensalidade atrasada há ${d} dia${d === 1 ? "" : "s"}`, tone: "red" }; }
  if (b.trial) return b.dueAt ? { text: `Teste grátis até ${day(b.dueAt)}`, tone: "muted" } : { text: "Teste grátis", tone: "muted" };
  return b.dueAt ? { text: `Em dia · próxima cobrança ${day(b.dueAt)}`, tone: "muted" } : null;
}
