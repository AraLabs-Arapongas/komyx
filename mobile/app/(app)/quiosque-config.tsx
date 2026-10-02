import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { Kiosk, setKioskEnabled, setKioskPin, useKioskSettings } from "@/lib/kiosk";
import { Badge, Button, Card, CardTitle, Field, Input, Muted, Screen } from "@/ui/components";
import { colors } from "@/ui/theme";

/** Owner-only: define the kiosk PIN and turn the tablet into the door board. */
export default function QuiosqueConfig() {
  const { profile } = useAuth();
  const { settings, refresh } = useKioskSettings();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [saving, setSaving] = useState(false);
  const isOwner = profile?.role === "owner";

  async function savePin() {
    if (pin !== pin2) { Alert.alert("PIN", "Os dois PINs não são iguais."); return; }
    setSaving(true);
    try { await setKioskPin(pin); setPin(""); setPin2(""); refresh(); Alert.alert("PIN salvo", "Guarde esse PIN: ele destrava o tablet."); }
    catch (e) { Alert.alert("PIN", (e as Error).message); }
    finally { setSaving(false); }
  }

  async function enable() {
    await setKioskEnabled(true);
    refresh();
    router.replace("/(app)/quiosque");
  }

  return (
    <Screen>
      <Card>
        <CardTitle title="Modo quiosque (tablet)" subtitle="Deixa o aparelho só na portaria da festa do dia. Para sair ou abrir suas telas, pede o PIN." />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Badge tone={settings?.enabled ? "green" : "zinc"}>{settings?.enabled ? "Ativo" : "Desligado"}</Badge>
          <Badge tone={settings?.hasPin ? "green" : "amber"}>{settings?.hasPin ? "PIN definido" : "Sem PIN"}</Badge>
          <Badge tone={Kiosk.available ? (Kiosk.isDeviceOwner() ? "green" : "amber") : "zinc"}>
            {Kiosk.available ? (Kiosk.isDeviceOwner() ? "Tablet Komyx (bloqueio total)" : "Android: fixa o app") : "Sem bloqueio do sistema"}
          </Badge>
        </View>
        <Muted>
          {Kiosk.available
            ? Kiosk.isDeviceOwner()
              ? "Este aparelho foi preparado pela AraLabs: no modo quiosque os botões de início e recentes ficam travados."
              : "No Android o app fica fixado na tela; para sair, o PIN do quiosque (ou o gesto de desafixar do próprio Android)."
            : "Neste aparelho o modo quiosque é só a tela da portaria em tela cheia; o sistema não bloqueia os botões."}
        </Muted>
      </Card>

      {isOwner ? (
        <>
          <Card>
            <CardTitle title={settings?.hasPin ? "Trocar o PIN" : "Definir o PIN"} subtitle="4 a 6 números. Só a dona deve saber." />
            <Field label="PIN"><Input value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} /></Field>
            <Field label="Repita o PIN"><Input value={pin2} onChangeText={(v) => setPin2(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} /></Field>
            <Button title="Salvar PIN" loading={saving} disabled={pin.length < 4} onPress={savePin} />
          </Card>
          <Card>
            <CardTitle title="Ligar o modo quiosque" subtitle="A tela vai para a portaria da festa de hoje. Mantenha o tablet na tomada." />
            <Button title={settings?.enabled ? "Voltar ao modo quiosque" : "Ligar agora"} disabled={!settings?.hasPin} onPress={enable} />
            {!settings?.hasPin ? <Text style={{ color: colors.muted, fontSize: 12 }}>Defina o PIN primeiro.</Text> : null}
            {settings?.enabled ? <Button title="Desligar o modo quiosque" variant="danger" onPress={async () => { await setKioskEnabled(false); refresh(); }} /> : null}
          </Card>
        </>
      ) : (
        <Card><Muted>Só a proprietária configura o modo quiosque.</Muted></Card>
      )}
    </Screen>
  );
}
