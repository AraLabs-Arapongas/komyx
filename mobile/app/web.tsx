import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Button, Loading, Muted } from "@/ui/components";
import { colors } from "@/ui/theme";

const isPdf = (u: string) => /\/pdf(\?|$)/.test(u) || /\.pdf(\?|$)/i.test(u);

/**
 * In-app browser for Komyx pages: the party page, quote and contract PDFs, the invite editor.
 * iOS renders PDFs natively; Android's WebView does not, so PDFs go through Google's viewer there.
 */
export default function Web() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const source = Platform.OS === "android" && isPdf(url) ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}` : url;
  const retry = () => { setError(null); setLoading(true); setAttempt((n) => n + 1); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: title ?? "Komyx" }} />
      {Platform.OS === "web" ? (
        <iframe src={url} title={title ?? "Komyx"} style={{ flex: 1, border: 0, width: "100%", height: "100%" }} />
      ) : error ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 }}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.dim} />
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>Não deu para abrir</Text>
          <Muted style={{ textAlign: "center" }}>{error}</Muted>
          <Button title="Tentar de novo" onPress={retry} />
          <Button title="Abrir no navegador" variant="ghost" size="sm" onPress={() => Linking.openURL(url)} />
        </View>
      ) : (
        <>
          {loading ? <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1, backgroundColor: colors.background }}><Loading /></View> : null}
          <WebView
            key={attempt}
            source={{ uri: source }}
            onLoadEnd={() => setLoading(false)}
            onError={(e) => { setLoading(false); setError(e.nativeEvent.description || "Sem conexão com o servidor."); }}
            onHttpError={(e) => { const s = e.nativeEvent.statusCode; if (s >= 400) { setLoading(false); setError(s === 404 ? "Esta página não existe mais ou o link foi desativado." : `O servidor respondeu com erro ${s}.`); } }}
            style={{ flex: 1, backgroundColor: colors.background }}
            allowsBackForwardNavigationGestures
            sharedCookiesEnabled
            setSupportMultipleWindows={false}
          />
        </>
      )}
    </View>
  );
}
