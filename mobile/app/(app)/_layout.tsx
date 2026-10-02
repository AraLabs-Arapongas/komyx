import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function AppLayout() {
  const { session, profile, loading, org } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/entrar" />;
  if (!profile) return <Redirect href="/cliente" />;
  if (org && org.status === "suspended") return <Redirect href="/entrar" />;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.brand, headerTitleStyle: { color: colors.foreground, fontWeight: "700" }, headerShadowVisible: false, headerBackTitle: "Voltar", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="eventos/[id]" options={{ title: "Evento" }} />
      <Stack.Screen name="notificacoes" options={{ title: "Notificações" }} />
      <Stack.Screen name="quiosque" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="quiosque-config" options={{ title: "Modo quiosque" }} />
    </Stack>
  );
}
