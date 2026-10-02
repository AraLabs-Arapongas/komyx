import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { WEB_URL } from "@/lib/supabase";
import { useKioskSettings } from "@/lib/kiosk";
import { Badge, Button, Card, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";
import { FestiveHeader } from "@/ui/festive-header";

function Item({ icon, label, onPress, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; href?: string }) {
  // router.push instead of <Link asChild>: the Link wrapper was dropping the row layout.
  return (
    <Pressable onPress={href ? () => router.push(href as never) : onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? colors.stone100 : colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border })}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function Menu() {
  const { profile, org, signOut } = useAuth();
  const { settings: kiosk } = useKioskSettings();
  const [now] = useState(() => Date.now());
  const publicUrl = org ? `${WEB_URL}/p/${org.slug}` : null;
  const daysLeft = org?.billing_due_at ? Math.ceil((new Date(org.billing_due_at).getTime() - now) / 86_400_000) : null;

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <FestiveHeader compact eyebrow={profile?.role === "owner" ? "Proprietária" : "Equipe"} title={org?.name ?? "Komyx"} subtitle={`${profile?.name} · ${profile?.email}`} />
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
          <Badge tone={org?.plan === "premium" ? "brand" : "zinc"}>{org?.plan === "premium" ? "Premium" : "Básico"}</Badge>
          {daysLeft != null ? <Muted>Fatura vence em {daysLeft} d ({formatDate(org!.billing_due_at!)})</Muted> : null}
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Item icon="document-text-outline" label="Orçamentos" onPress={() => Linking.openURL(`${WEB_URL}/orcamentos`)} />
        <Item icon="people-outline" label="Clientes" onPress={() => Linking.openURL(`${WEB_URL}/clientes`)} />
        <Item icon="gift-outline" label="Aniversariantes" onPress={() => Linking.openURL(`${WEB_URL}/aniversariantes`)} />
        {profile?.role === "owner" ? <Item icon="cube-outline" label="Pacotes e temas" onPress={() => Linking.openURL(`${WEB_URL}/pacotes`)} /> : null}
        {profile?.role === "owner" ? <Item icon="settings-outline" label="Configurações" onPress={() => Linking.openURL(`${WEB_URL}/configuracoes`)} /> : null}
        <Item icon="person-circle-outline" label="Minha conta" onPress={() => Linking.openURL(`${WEB_URL}/conta`)} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 }}>Divulgar</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        {publicUrl ? <Item icon="share-outline" label="Compartilhar minha página pública" onPress={() => Share.share({ message: publicUrl })} /> : null}
        {publicUrl ? <Item icon="globe-outline" label="Abrir minha página pública" onPress={() => Linking.openURL(publicUrl)} /> : null}
      </View>
      <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 }}>Aparelho</Text>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Item icon="notifications-outline" label="Notificações" href="/(app)/notificacoes" />
        {profile?.role === "owner" ? <Item icon="tablet-landscape-outline" label={kiosk?.enabled ? "Modo quiosque (ativo) · configurar" : "Modo quiosque (tablet na portaria)"} href="/(app)/quiosque-config" /> : null}
        {kiosk?.enabled ? <Item icon="lock-closed-outline" label="Voltar ao modo quiosque" href="/(app)/quiosque" /> : null}
        {__DEV__ || profile?.is_platform_admin || profile?.role === "owner" ? <Item icon="construct-outline" label="Dev tools (splash, onboarding, quiosque)" href="/dev" /> : null}
        <Item icon="people-outline" label="Entrar como cliente (testar)" href="/entrar" />
      </View>
      <View style={{ padding: 16 }}>
        <Button title="Sair" variant="outline" onPress={async () => { await signOut(); router.replace("/entrar"); }} />
        <Muted style={{ textAlign: "center", marginTop: 16 }}>Komyx · desenvolvido por AraLabs</Muted>
      </View>
    </Screen>
  );
}
