import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors } from "@/ui/theme";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTitleStyle: { color: colors.foreground, fontWeight: "700" }, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="home" options={{ title: "Início", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="solicitacoes" options={{ title: "Solicitações", tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
