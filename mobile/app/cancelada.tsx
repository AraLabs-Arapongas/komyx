import { Linking, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Muted, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";
import { day } from "@/ui/billing-notice";

/**
 * Cancelled subscription whose paid access has ended (same rule as the web /cancelada). Data stays for 90
 * days. No payment link here (App Store rules): only the help contact and a refresh once reactivated.
 */
export default function CancelledScreen() {
  const { org, refresh, signOut } = useAuth();
  const [checking, setChecking] = useState(false);
  if (org && org.status !== "cancelled") return <Redirect href="/" />;
  return (
    <Screen>
      <View style={{ gap: 16, paddingTop: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.foreground }}>Assinatura cancelada</Text>
        <Muted>A assinatura do Komyx de {org?.name ?? "seu buffet"} foi cancelada{org?.access_until ? ` e o acesso terminou em ${day(org.access_until)}` : ""}. Agenda, clientes, orçamentos e contratos continuam guardados por 90 dias.</Muted>
        <Card>
          <Text style={{ fontWeight: "700", color: colors.foreground, marginBottom: 6 }}>Quer voltar?</Text>
          <Muted>Fale com a gente pelo e-mail contato@komyx.com.br. Assim que a assinatura for reativada, tudo volta como estava.</Muted>
          <View style={{ gap: 10, marginTop: 14 }}>
            <Button title="Escrever para contato@komyx.com.br" variant="outline" onPress={() => Linking.openURL("mailto:contato@komyx.com.br?subject=Reativar%20assinatura")} />
            <Button title="Já reativei · verificar de novo" loading={checking} onPress={async () => { setChecking(true); try { await refresh(); } finally { setChecking(false); } }} />
          </View>
        </Card>
        <Button title="Sair" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
