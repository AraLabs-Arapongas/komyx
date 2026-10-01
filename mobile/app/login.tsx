import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

// Dev-only shortcuts for the seeded accounts (same as the web login).
const DEV_ACCOUNTS = __DEV__ ? [
  { label: "Dona (owner)", email: "dona@festabuffet.test" },
  { label: "Ana (equipe)", email: "ana@festabuffet.test" },
  { label: "João (outro buffet)", email: "joao@alegriakids.test" },
] : [];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) { setError("E-mail ou senha incorretos."); return; }
    router.replace("/(app)/(tabs)/home");
  }

  return (
    <Screen>
      <Text style={styles.title}>Entrar no buffet</Text>
      <Muted>Use o mesmo e-mail e senha do Festeja na web.</Muted>
      {DEV_ACCOUNTS.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {DEV_ACCOUNTS.map((a) => (
            <Pressable key={a.email} onPress={() => { setEmail(a.email); setPassword("senha12345"); }} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface }}>
              <Text style={{ fontSize: 12, color: colors.muted }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field label="E-mail"><Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="voce@buffet.com" /></Field>
      <Field label="Senha" error={error}><Input value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" onSubmitEditing={submit} /></Field>
      <Button title="Entrar" size="lg" onPress={submit} loading={busy} />
    </Screen>
  );
}
