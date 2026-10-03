import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AnimatedSplash } from "@/ui/animated-splash";
import { applyAppFont, useAppFonts } from "@/ui/fonts";
import { PartyProvider } from "@/lib/party-context";
import { FestiveNavHeader } from "@/ui/festive-nav-header";
import { colors } from "@/ui/theme";

// The native splash stays until the animated one takes over (it calls hideAsync on mount).
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1 } } });

function Shell() {
  const { loading } = useAuth();
  const fontsLoaded = useAppFonts();
  if (fontsLoaded) applyAppFont();
  const [splashDone, setSplashDone] = useState(false);
  const onDone = useCallback(() => setSplashDone(true), []);
  return (
    <>
      <Stack screenOptions={{ header: (p) => <FestiveNavHeader {...p} />, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
        <Stack.Screen name="dev" options={{ title: "Dev tools", headerBackTitle: "Voltar" }} />
        <Stack.Screen name="dev-splash" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="cliente" options={{ headerShown: false }} />
        <Stack.Screen name="escolher-festa" options={{ headerShown: false, animation: "fade" }} />
        <Stack.Screen name="convidado/[token]" options={{ title: "Convite", headerBackTitle: "Voltar" }} />
        <Stack.Screen name="r/[token]" options={{ headerShown: false }} />
        <Stack.Screen name="g/[token]" options={{ headerShown: false }} />
      </Stack>
      {!splashDone ? <AnimatedSplash ready={!loading && fontsLoaded} onDone={onDone} /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PartyProvider>
        <Shell />
        </PartyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
