import { Redirect, Stack, router } from "expo-router";
import { useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { mustChangePassword, useAuth } from "@/lib/auth";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Button, Card, Field, Muted, Screen } from "@/ui/components";
import { PasswordInput } from "@/ui/password-input";
import { colors } from "@/ui/theme";

/**
 * "Crie sua senha": the admin set a temporary password (app_metadata.must_change_password), so the
 * app stays here until the person picks their own, like /nova-senha?obrigatoria=1 on the web.
 * Same rules as the web NewPasswordForm / setNewPassword.
 */
export default function NovaSenha() {
  const { session, loading, signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  // The password the server already accepted: a retry after a network error only finishes the rest.
  const [saved, setSaved] = useState<string | null>(null);

  if (!loading && !session) return <Redirect href="/entrar" />;
  if (!loading && session && !mustChangePassword(session) && !busy) return <Redirect href="/" />;

  async function save() {
    Keyboard.dismiss();
    const e: typeof errors = {};
    if (password.length < 8) e.password = "Use pelo menos 8 caracteres";
    if (password !== confirm) e.confirm = "As senhas não conferem";
    if (e.password || e.confirm) { setErrors({ ...e, form: "Verifique os campos." }); return; }
    setErrors({});
    setBusy(true);
    try {
      const { error } = saved === password ? { error: null } : await supabase.auth.updateUser({ password });
      if (error) {
        if (error.code === "same_password") { setErrors({ form: "Escolha uma senha diferente da anterior.", password: "Igual à senha anterior" }); return; }
        if (error.code === "weak_password") { setErrors({ form: "Senha fraca. Use pelo menos 8 caracteres.", password: "Senha fraca" }); return; }
        setErrors({ form: "Não foi possível salvar a nova senha. Tente de novo." });
        return;
      }
      setSaved(password);
      // The temporary password is gone: the web clears the flag (service role), then a fresh token drops it.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`${WEB_URL}/api/auth/password-changed`, { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` } }).catch(() => null);
      if (!res?.ok) { setErrors({ form: "Sua senha foi salva, mas não deu para concluir agora. Confira a internet e toque em Salvar de novo." }); return; }
      await supabase.auth.refreshSession();
      router.replace("/(app)/(tabs)/home");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <Screen safeTop>
        <View style={{ gap: 16, paddingTop: 24 }}>
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 26, fontWeight: "800", color: colors.foreground }}>Crie sua senha</Text>
            <Muted style={{ fontSize: 14 }}>Você entrou com uma senha provisória do suporte. Escolha a sua para continuar.</Muted>
          </View>
          <Card>
            <View style={{ gap: 14 }}>
              <Field label="Nova senha" error={errors.password}>
                <PasswordInput value={password} onChangeText={(v) => { setPassword(v); setErrors({}); }} textContentType="newPassword" autoComplete="new-password" placeholder="••••••••" returnKeyType="next" />
                {errors.password ? null : <Muted style={{ fontSize: 12 }}>Pelo menos 8 caracteres</Muted>}
              </Field>
              <Field label="Repita a nova senha" error={errors.confirm}>
                <PasswordInput value={confirm} onChangeText={(v) => { setConfirm(v); setErrors({}); }} textContentType="newPassword" autoComplete="new-password" placeholder="••••••••" returnKeyType="go" onSubmitEditing={save} />
              </Field>
              {errors.form ? <Text style={{ color: colors.red }}>{errors.form}</Text> : null}
              <Button title="Salvar e entrar" size="lg" loading={busy} onPress={save} />
            </View>
          </Card>
          <Button title="Sair" variant="ghost" onPress={signOut} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
