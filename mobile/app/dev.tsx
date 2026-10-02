import Constants from "expo-constants";
import { router } from "expo-router";
import { Alert, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Kiosk, setKioskEnabled } from "@/lib/kiosk";
import { setOnboardingSeen } from "@/lib/prefs";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Badge, Button, Card, CardTitle, Muted, Screen } from "@/ui/components";

/**
 * Dev tools: reach every one-off screen (splash, onboarding, kiosk) at any time and reset device
 * flags. Opened from Menu (owner / platform admin / __DEV__) or by tapping the logo 7× on Entrar.
 */
export default function DevTools() {
  const { session, profile, org } = useAuth();
  const host = (() => { try { return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").host; } catch { return "?"; } })();

  return (
    <Screen>
      <Card>
        <CardTitle title="Telas" subtitle="Veja qualquer tela especial sem precisar reinstalar." />
        <Button title="Splash animada" onPress={() => router.push("/dev-splash")} />
        <Button title="Onboarding" variant="secondary" onPress={() => router.push("/onboarding")} />
        <Button title="Tela de entrar" variant="secondary" onPress={() => router.push("/entrar")} />
        <Button title="Modo quiosque (configurar)" variant="secondary" onPress={() => router.push("/(app)/quiosque-config")} />
        <Button title="Modo quiosque (tela)" variant="secondary" onPress={() => router.push("/(app)/quiosque")} />
      </Card>
      <Card>
        <CardTitle title="Resetar flags do aparelho" />
        <Button title="Mostrar onboarding de novo" variant="outline" onPress={async () => { await setOnboardingSeen(false); Alert.alert("Ok", "Na próxima abertura sem sessão o onboarding aparece."); }} />
        <Button title="Desligar modo quiosque" variant="outline" onPress={async () => { await setKioskEnabled(false); Alert.alert("Ok", "Quiosque desligado."); }} />
        <Button title="Sair da conta" variant="danger" onPress={async () => { await supabase.auth.signOut(); router.replace("/entrar"); }} />
      </Card>
      <Card>
        <CardTitle title="Ambiente" />
        <Row k="Web" v={WEB_URL} />
        <Row k="Supabase" v={host} />
        <Row k="Versão" v={`${Constants.expoConfig?.version ?? "?"} · ${Constants.expoConfig?.runtimeVersion ? String(Constants.expoConfig.runtimeVersion) : "sem runtime"}`} />
        <Row k="Modo" v={__DEV__ ? "desenvolvimento" : "produção"} />
        <Row k="Quiosque nativo" v={Kiosk.available ? (Kiosk.isDeviceOwner() ? "dono do aparelho" : "disponível (fixar app)") : "indisponível (Expo Go / iOS)"} />
      </Card>
      <Card>
        <CardTitle title="Sessão" />
        <Row k="Usuário" v={session?.user.email ?? session?.user.phone ?? "—"} />
        <Row k="Perfil" v={profile ? `${profile.name} · ${profile.role}${profile.is_platform_admin ? " · admin" : ""}` : "—"} />
        <Row k="Buffet" v={org ? `${org.name} (${org.slug}) · ${org.plan} · ${org.status}` : "—"} />
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}><Badge tone={session ? "green" : "zinc"}>{session ? "logado" : "sem sessão"}</Badge></View>
      </Card>
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Muted>{k}</Muted>
      <Text style={{ fontSize: 13, flexShrink: 1, textAlign: "right" }} selectable>{v}</Text>
    </View>
  );
}
