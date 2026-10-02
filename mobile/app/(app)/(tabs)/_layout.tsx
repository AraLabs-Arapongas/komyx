import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { FestiveNavHeader } from "@/ui/festive-nav-header";
import { colors, fonts } from "@/ui/theme";

/** Round "+" in the middle of the tab bar: the owner's most common action, a new quote. */
function PlusButton() {
  return (
    <Pressable onPress={() => router.push("/(app)/novo-orcamento")} accessibilityLabel="Novo orçamento" style={{ top: -16, alignItems: "center", justifyContent: "flex-start", gap: 2 }}>
      <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.ink, shadowColor: colors.brand, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <Ionicons name="add" size={30} color="#fff" />
      </View>
      <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.sun }}>Orçamento</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.sun, tabBarInactiveTintColor: "#9da1bd", tabBarStyle: { backgroundColor: colors.ink, borderTopColor: "rgba(255,255,255,0.08)", height: 66, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.bold }, header: (p) => <FestiveNavHeader {...p} />, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="home" options={{ title: "Início", tabBarLabel: "Início", headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="agenda" options={{ title: "Agenda", tabBarLabel: "Agenda", tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="novo" options={{ title: "Novo orçamento", tabBarLabel: "", tabBarButton: () => <PlusButton /> }} listeners={{ tabPress: (e) => { e.preventDefault(); router.push("/(app)/novo-orcamento"); } }} />
      <Tabs.Screen name="solicitacoes" options={{ title: "Solicitações", tabBarLabel: "Solicitações", tabBarIcon: ({ color, size }) => <Ionicons name="mail-unread-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarLabel: "Menu", headerShown: false, tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
