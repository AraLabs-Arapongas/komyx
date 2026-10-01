import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/ui/theme";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.brand, headerTitleStyle: { color: colors.foreground, fontWeight: "700" }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="entrar" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="cliente/index" options={{ headerShown: false }} />
          <Stack.Screen name="cliente/reserva/[token]" options={{ title: "Minha reserva", headerBackTitle: "Voltar" }} />
          <Stack.Screen name="cliente/convite/[token]" options={{ title: "Convite", headerBackTitle: "Voltar" }} />
          <Stack.Screen name="r/[token]" options={{ headerShown: false }} />
          <Stack.Screen name="g/[token]" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
