import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { formatDateLong, formatTime } from "@/lib/format";
import { useParty } from "@/lib/party-context";
import { useReservationView } from "@/lib/reservation-view";
import { FestiveNavHeader } from "@/ui/festive-nav-header";
import { colors, fonts } from "@/ui/theme";

/**
 * The client side of the app: one tab bar, always visible. Início lists the parties and shows the
 * chosen one; the other tabs act on that party. The header names the party in context.
 */
function ClienteTabs() {
  const { token } = useParty();
  const { view } = useReservationView(token ?? "");
  const eyebrow = view ? view.title : "Komyx";
  const subtitle = view ? `${formatDateLong(view.ev.starts_at)} · ${formatTime(view.ev.starts_at)} · ${view.org.name}` : undefined;
  const locked = Boolean(view?.locked);
  const lock = { tabBarItemStyle: locked ? { opacity: 0.35 } : undefined };
  const block = { tabPress: (e: { preventDefault: () => void }) => { if (locked) e.preventDefault(); } };
  const icon = (name: keyof typeof Ionicons.glyphMap) => function TabIcon({ color, size }: { color: ColorValue; size: number }) { return <Ionicons name={name} color={color} size={size} />; };
  return (
    <Tabs screenOptions={{ header: (p) => <FestiveNavHeader {...p} eyebrow={eyebrow} subtitle={subtitle} />, tabBarActiveTintColor: colors.sun, tabBarInactiveTintColor: "#9da1bd", tabBarStyle: { backgroundColor: colors.ink, borderTopColor: "rgba(255,255,255,0.08)", height: 66, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.bold }, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" options={{ title: view ? "Minha festa" : "Minhas festas", tabBarLabel: "Início", tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="pagamento" listeners={block} options={{ ...lock, title: "Pagamento", tabBarIcon: icon("qr-code-outline"), tabBarBadge: view && !locked && view.showPrices && view.balance > 0 ? "" : undefined, tabBarBadgeStyle: { backgroundColor: colors.brand, minWidth: 10, height: 10, borderRadius: 5, top: 2 } }} />
      <Tabs.Screen name="convidados" listeners={block} options={{ ...lock, title: "Convidados", tabBarIcon: icon("people-outline") }} />
      <Tabs.Screen name="convite" listeners={block} options={{ ...lock, title: "Convite", tabBarIcon: icon("mail-open-outline") }} />
      <Tabs.Screen name="local" listeners={block} options={{ ...lock, title: "Local", tabBarIcon: icon("navigate-outline") }} />
      <Tabs.Screen name="reserva/[token]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

export default function ClienteLayout() {
  return <ClienteTabs />;
}
