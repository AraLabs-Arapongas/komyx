import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { maskPhoneInput, normalizePhone } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input, Muted, styles } from "@/ui/components";
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
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<TextInput>(null);
  const d = useMemo(() => detect(id), [id]);

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
    <SafeAreaView style={[styles.screen, { padding: 24, gap: 16 }]}>
      <View style={{ marginTop: 40, gap: 10 }}>
        <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 24 }}>F</Text>
        </View>
        <Text style={[styles.title, { fontSize: 28 }]}>Festeja</Text>
        <Muted style={{ fontSize: 15 }}>Buffet: entre com seu e-mail. Cliente: use o celular da reserva.</Muted>
      </View>

      {DEV_ACCOUNTS.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DEV_ACCOUNTS.map((a) => (
            <Pressable key={a.value} onPress={() => { setId(maskPhoneInput(a.value)); setPassword(a.value.includes("@") ? "senha12345" : ""); setCode(""); setCodeSent(false); setError(null); }} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>{a.label}</Text>
            </Pressable>
          ))}
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
      <Button title={cta} size="lg" onPress={() => go()} loading={busy} disabled={d.kind === "unknown" || (codeSent && code.length < 6)} />
      {codeSent ? <Button title="Não recebi · reenviar ou trocar número" variant="ghost" size="sm" onPress={() => { setCodeSent(false); setCode(""); }} /> : null}
    </SafeAreaView>
  );
}
