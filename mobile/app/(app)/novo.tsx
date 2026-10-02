import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatPhone, maskPhoneInput, normalizePhone } from "@/lib/format";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Button, Field, Input, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

type Customer = { id: string; name: string; whatsapp: string };

/**
 * Novo orçamento, step one: who is it for. Type a WhatsApp or a name; an existing customer is
 * found (repeat customers in one tap) or a new one is created. Then the quote wizard (same one as
 * on the web: package, date, people, review) opens in the in-app browser already pointed at that
 * customer, so nothing is typed twice.
 */
export default function Novo() {
  const { profile, org } = useAuth();
  const params = useLocalSearchParams<{ request?: string; name?: string; whatsapp?: string }>();
  const [term, setTerm] = useState(params.whatsapp ? maskPhoneInput(params.whatsapp) : params.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const digits = normalizePhone(term);
  const looksLikePhone = digits.length >= 8 && !/[a-zA-Z]/.test(term);

  const search = useQuery({
    queryKey: ["customers-search", term],
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      let qb = supabase.from("customers").select("id, name, whatsapp").eq("organization_id", profile!.organization_id).limit(6);
      qb = looksLikePhone ? qb.ilike("whatsapp", `%${digits}%`) : qb.ilike("name", `%${term.trim()}%`);
      const { data, error } = await qb.order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Customer[];
    },
  });

  async function openWizard(qs: string) {
    const url = `${WEB_URL}/eventos/novo${qs}`;
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
    router.back();
  }

  async function createAndGo() {
    setError(null);
    if (!looksLikePhone) { setError("Para criar um cliente novo, digite o WhatsApp dele."); return; }
    const name = params.name?.trim() || "";
    setBusy(true);
    const { data, error } = await supabase.from("customers").insert({ organization_id: profile!.organization_id, name: name || `Cliente ${formatPhone(digits)}`, whatsapp: digits, source: "APP" }).select("id").single();
    setBusy(false);
    if (error) { setError(error.message); return; }
    await openWizard(`?customer=${data.id}`);
  }

  const publicUrl = org ? `${WEB_URL}/p/${org.slug}` : null;
  const exact = search.data?.find((c) => normalizePhone(c.whatsapp) === digits);

  return (
    <Screen>
      <View>
        <Text style={[styles.title, { fontSize: 24 }]}>Para quem é o orçamento?</Text>
        <Muted>WhatsApp ou nome. Cliente que já fez festa aparece aqui.</Muted>
      </View>
      <Field label="WhatsApp ou nome">
        <Input value={term} onChangeText={(v: string) => { setTerm(maskPhoneInput(v)); setError(null); }} placeholder="(11) 99999-0000 ou Mariana" autoFocus autoCapitalize="words" autoCorrect={false} keyboardType="default" />
      </Field>

      {search.data?.length ? (
        <View style={{ gap: 8 }}>
          {search.data.map((c) => (
            <Pressable key={c.id} onPress={() => openWizard(`?customer=${c.id}${params.request ? `&request=${params.request}` : ""}`)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: pressed ? colors.stone100 : colors.surface, borderWidth: 1, borderColor: colors.border })}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.brand, fontWeight: "800" }}>{c.name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.h3}>{c.name}</Text>
                <Muted>{formatPhone(c.whatsapp)} · cliente</Muted>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {term.trim().length >= 2 && !search.isLoading && !exact ? (
        <Button title={looksLikePhone ? `Novo cliente ${formatPhone(digits)} · continuar` : "Digite o WhatsApp para criar um cliente novo"} onPress={createAndGo} loading={busy} disabled={!looksLikePhone} />
      ) : null}
      {params.request ? <Button title="Continuar a partir da solicitação" variant="secondary" onPress={() => openWizard(`?request=${params.request}`)} /> : null}
      {error ? <Text style={{ color: colors.red }}>{error}</Text> : null}

      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
      <Button title="Montar sem cliente ainda" variant="outline" onPress={() => openWizard("")} />
      <Button title="Mandar minha página para o cliente montar sozinho" variant="ghost" size="sm" onPress={() => publicUrl && Share.share({ message: `Monte o orçamento da sua festa no ${org?.name}: ${publicUrl}` })} />
      <Muted style={{ textAlign: "center" }}>O assistente (pacote, data, pessoas, revisão) abre no navegador do app; na primeira vez pede seu login do Komyx.</Muted>
    </Screen>
  );
}
