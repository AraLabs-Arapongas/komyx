import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/ui/theme";

/** Round "+" in the middle of the tab bar: the owner's most common action, a new quote. */
function PlusButton() {
  return (
    <Pressable onPress={() => router.push("/(app)/novo-orcamento")} accessibilityLabel="Novo orçamento" style={{ top: -16, alignItems: "center", justifyContent: "flex-start", gap: 2 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.surface, shadowColor: colors.brand, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <Ionicons name="add" size={30} color="#fff" />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.brand }}>Orçamento</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "600" }, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTitleStyle: { color: colors.foreground, fontWeight: "700" }, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="home" options={{ title: "Início", tabBarLabel: "Início", tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda", tabBarLabel: "Agenda", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="novo" options={{ title: "Novo orçamento", tabBarLabel: "", tabBarButton: () => <PlusButton /> }} listeners={{ tabPress: (e) => { e.preventDefault(); router.push("/(app)/novo-orcamento"); } }} />
      <Tabs.Screen name="solicitacoes" options={{ title: "Solicitações", tabBarLabel: "Solicitações", tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarLabel: "Menu", tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
