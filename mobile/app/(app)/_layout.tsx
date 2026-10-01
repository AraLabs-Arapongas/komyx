import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function AppLayout() {
  const { session, loading, org } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (org && org.status === "suspended") return <Redirect href="/welcome" />;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.brand, headerTitleStyle: { color: colors.foreground, fontWeight: "700" }, headerShadowVisible: false, headerBackTitle: "Voltar", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="eventos/[id]" options={{ title: "Evento" }} />
      <Stack.Screen name="notificacoes" options={{ title: "Notificações" }} />
    </Stack>
  );
}
