import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { maskPhoneInput, normalizePhone } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { KomyxLogo } from "@/ui/brand";
import { Button, Field, Input, Muted, styles } from "@/ui/components";
import { PartyBackdrop, party } from "@/ui/party";
import { colors } from "@/ui/theme";

// Dev-only shortcuts for seeded accounts. Seed phones use the fixed code 123456 (supabase/config.toml test_otp).
const DEV_ACCOUNTS = __DEV__ ? [
  { label: "Dona (buffet)", value: "dona@festabuffet.test" },
  { label: "Ana (equipe)", value: "ana@festabuffet.test" },
  { label: "Roberto (cliente)", value: "11999990002" },
  { label: "Carla (cliente)", value: "11999990001" },
] : [];

type Kind = "email" | "phone" | "token" | "unknown";

function detect(input: string): { kind: Kind; token?: string; tokenKind?: "r" | "g" } {
  const v = input.trim();
  const t = v.match(/(?:\/(r|g)\/)?([0-9a-f]{48})/i);
  if (t) return { kind: "token", token: t[2], tokenKind: (t[1] ?? "r") as "r" | "g" };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { kind: "email" };
  const digits = normalizePhone(v);
  if (digits.length >= 10 && digits.length <= 13 && /^[\d\s()+-]+$/.test(v)) return { kind: "phone" };
  return { kind: "unknown" };
}

function toE164(input: string) {
  const d = normalizePhone(input);
  return `+${d.startsWith("55") && d.length >= 12 ? d : `55${d}`}`;
}

export default function Entrar() {
  const { height } = useWindowDimensions();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<TextInput>(null);
  const taps = useRef(0);
  const d = useMemo(() => detect(id), [id]);
  const headerH = Math.max(230, Math.min(320, height * 0.36));

  // Hidden door to the dev tools: 7 taps on the logo.
  function onLogoTap() {
    taps.current += 1;
    if (taps.current >= 7) { taps.current = 0; router.push("/dev"); }
  }

  async function go(codeOverride?: string) {
    const otp = (codeOverride ?? code).trim();
    setError(null);
    Keyboard.dismiss();
    if (d.kind === "token") {
      router.replace(d.tokenKind === "g" ? { pathname: "/cliente/convite/[token]", params: { token: d.token! } } : { pathname: "/cliente/reserva/[token]", params: { token: d.token! } });
      return;
    }
    if (d.kind === "email") {
      if (!password) { setError("Digite sua senha."); return; }
      setBusy(true);
      const { error } = await supabase.auth.signInWithPassword({ email: id.trim().toLowerCase(), password });
      setBusy(false);
      if (error) { setError("E-mail ou senha incorretos."); return; }
      router.replace("/(app)/(tabs)/home");
      return;
    }
    if (d.kind === "phone") {
      setBusy(true);
      if (!codeSent) {
        const { error } = await supabase.auth.signInWithOtp({ phone: toE164(id) });
        setBusy(false);
        if (error) { setError(error.message.includes("rate") ? "Aguarde um pouco antes de pedir outro código." : "Não conseguimos enviar o SMS. Confira o número e tente de novo."); return; }
        setCodeSent(true);
        setTimeout(() => codeRef.current?.focus(), 100);
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ phone: toE164(id), token: otp, type: "sms" });
      setBusy(false);
      if (error) { setError("Código inválido ou vencido. Peça um novo."); return; }
      router.replace("/cliente");
      return;
    }
    setError("Digite seu e-mail (buffet), seu WhatsApp (cliente) ou cole o link que recebeu.");
  }

  const cta = d.kind === "email" ? "Entrar no buffet" : d.kind === "phone" ? (codeSent ? "Confirmar código" : "Receber código por SMS") : d.kind === "token" ? "Abrir" : "Continuar";

  return (
    <View style={{ flex: 1, backgroundColor: party.ink }}>
      <StatusBar style="light" />
      {/* Festive header: ink sky, bunting, balloons, the brand. */}
      <View style={{ height: headerH }}>
        <PartyBackdrop density={0.5} height={headerH} />
        <SafeAreaView edges={["top"]} style={{ flex: 1, justifyContent: "flex-end", padding: 24, paddingBottom: 28 }}>
          <Pressable onPress={onLogoTap} hitSlop={10} style={{ alignSelf: "flex-start" }}>
            <KomyxLogo size={56} />
          </Pressable>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, marginTop: 16, lineHeight: 30 }}>A festa se vende sozinha.{"\n"}Você só confirma.</Text>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -20 }} contentContainerStyle={{ padding: 24, paddingTop: 26, gap: 14, paddingBottom: 40 }}>
          <View>
            <Text style={[styles.title, { fontSize: 22 }]}>Entrar</Text>
            <Muted style={{ fontSize: 14 }}>Buffet: seu e-mail e senha. Cliente: o celular da reserva, com código por SMS.</Muted>
          </View>

          {DEV_ACCOUNTS.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {DEV_ACCOUNTS.map((a) => (
                <Pressable key={a.value} onPress={() => { setId(maskPhoneInput(a.value)); setPassword(a.value.includes("@") ? "senha12345" : ""); setCode(""); setCodeSent(false); setError(null); }} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface }}>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{a.label}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => router.push("/dev")} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="construct-outline" size={12} color={colors.muted} /><Text style={{ fontSize: 12, color: colors.muted }}>Dev tools</Text>
              </Pressable>
            </View>
          ) : null}

          <Field label="E-mail ou celular">
            <Input value={id} onChangeText={(v: string) => { setId(maskPhoneInput(v)); setError(null); setCodeSent(false); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="voce@buffet.com ou (11) 99999-0000" returnKeyType="next" editable={!codeSent} />
          </Field>
          {d.kind === "email" ? (
            <Field label="Senha"><Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" onSubmitEditing={() => go()} returnKeyType="go" /></Field>
          ) : null}
          {d.kind === "phone" && codeSent ? (
            <Field label={`Código enviado por SMS para ${id}`}>
              <Input ref={codeRef} value={code} onChangeText={(v: string) => { const digits = v.replace(/\D/g, "").slice(0, 6); setCode(digits); if (digits.length === 6) setTimeout(() => go(digits), 50); }} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" placeholder="123456" maxLength={6} onSubmitEditing={() => go()} returnKeyType="go" style={{ letterSpacing: 6, textAlign: "center", fontSize: 22 }} />
            </Field>
          ) : null}
          {error ? <Text style={{ color: colors.red }}>{error}</Text> : null}
          <Button title={cta} size="lg" onPress={() => go()} loading={busy} disabled={d.kind === "unknown" || (codeSent && code.length < 6)} style={{ backgroundColor: party.berry, borderColor: party.berry, borderRadius: 999 }} />
          {codeSent ? <Button title="Não recebi · reenviar ou trocar número" variant="ghost" size="sm" onPress={() => { setCodeSent(false); setCode(""); }} /> : null}
          <Muted style={{ textAlign: "center", marginTop: 8 }}>Ainda não tem buffet no Komyx? Crie pelo site: 1 mês grátis.</Muted>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
