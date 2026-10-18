import { Linking, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Muted, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";

/**
 * "Acesso pausado" (docs/assinatura.md §4): the Komyx payment is 10 days late. The public page keeps
 * taking requests; the app stays closed until the payment is confirmed. No payment link here
 * (App Store rules): only the help contact and a refresh once paid.
 */
export default function PausedScreen() {
  const { org, refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  if (org && !org.paused) return <Redirect href="/" />;
  return (
    <Screen>
      <View style={{ gap: 16, paddingTop: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.foreground }}>Seu acesso está pausado</Text>
        <Muted>A mensalidade da Komyx de {org?.name ?? "seu buffet"} está em atraso. Sua página pública continua no ar e recebendo pedidos de orçamento; eles estarão aqui quando o acesso voltar.</Muted>
        <Card>
          <Text style={{ fontWeight: "700", color: colors.foreground, marginBottom: 6 }}>Precisa de ajuda?</Text>
          <Muted>Fale com a gente pelo e-mail contato@komyx.com.br. Assim que o pagamento for confirmado, o acesso volta sozinho.</Muted>
          <View style={{ gap: 10, marginTop: 14 }}>
            <Button title="Escrever para contato@komyx.com.br" variant="outline" onPress={() => Linking.openURL("mailto:contato@komyx.com.br?subject=Acesso%20pausado")} />
            <Button title="Já foi pago · verificar de novo" loading={checking} onPress={async () => { setChecking(true); try { await refresh(); } finally { setChecking(false); } }} />
          </View>
        </Card>
        <Button title="Sair" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
