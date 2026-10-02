import { Ionicons } from "@expo/vector-icons";
import { Tabs, router, useLocalSearchParams } from "expo-router";
import type { ColorValue } from "react-native";
import { formatDateLong, formatTime } from "@/lib/format";
import { useReservationView } from "@/lib/reservation-view";
import { FestiveNavHeader } from "@/ui/festive-nav-header";
import { colors, fonts } from "@/ui/theme";

/**
 * The party owner's panel as five tabs: Festa, Pagamento, Convidados, Convite, Local. Same ink
 * tab bar and festive header as the buffet side, so the app feels like one product.
 */
export default function ReservaTabs() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { view } = useReservationView(token);
  const eyebrow = view?.title ?? "Minha festa";
  const subtitle = view ? `${formatDateLong(view.ev.starts_at)} · ${formatTime(view.ev.starts_at)} · ${view.org.name}` : undefined;
  const onBack = () => (router.canGoBack() ? router.back() : router.replace("/cliente"));
  const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;
  return (
    <Tabs screenOptions={{ header: (p) => <FestiveNavHeader {...p} eyebrow={eyebrow} subtitle={subtitle} onBack={onBack} />, tabBarActiveTintColor: colors.sun, tabBarInactiveTintColor: "#9da1bd", tabBarStyle: { backgroundColor: colors.ink, borderTopColor: "rgba(255,255,255,0.08)", height: 66, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.bold }, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" options={{ title: "Minha festa", tabBarLabel: "Festa", tabBarIcon: icon("balloon-outline") }} />
      <Tabs.Screen name="pagamento" options={{ title: "Pagamento", tabBarIcon: icon("qr-code-outline"), tabBarBadge: view && view.showPrices && view.balance > 0 ? "" : undefined, tabBarBadgeStyle: { backgroundColor: colors.brand, minWidth: 10, height: 10, borderRadius: 5, top: 2 } }} />
      <Tabs.Screen name="convidados" options={{ title: "Convidados", tabBarIcon: icon("people-outline") }} />
      <Tabs.Screen name="convite" options={{ title: "Convite", tabBarIcon: icon("mail-open-outline") }} />
      <Tabs.Screen name="local" options={{ title: "Local", tabBarIcon: icon("navigate-outline") }} />
    </Tabs>
  );
}
