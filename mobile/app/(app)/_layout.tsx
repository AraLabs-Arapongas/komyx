import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/ui/components";
import { colors, fonts } from "@/ui/theme";

export default function AppLayout() {
  const { session, profile, loading, org } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/entrar" />;
  if (!profile) return <Redirect href="/cliente" />;
  if (org && org.status === "suspended") return <Redirect href="/entrar" />;
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.brand, headerTitleStyle: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 18 }, headerBackTitleStyle: { fontFamily: fonts.semibold }, headerShadowVisible: false, headerBackTitle: "Voltar", contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="eventos/[id]" options={{ title: "Evento" }} />
      <Stack.Screen name="notificacoes" options={{ title: "Notificações" }} />
      <Stack.Screen name="novo-orcamento" options={{ title: "Novo orçamento", presentation: "modal", headerBackTitle: "Fechar" }} />
      <Stack.Screen name="pendencias" options={{ title: "A fazer agora" }} />
      <Stack.Screen name="quiosque" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="quiosque-config" options={{ title: "Modo quiosque" }} />
    </Stack>
  );
}
