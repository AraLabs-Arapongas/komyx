import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { WEB_URL } from "@/lib/supabase";
import { Badge, Button, Card, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

function Item({ icon, label, onPress, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; href?: string }) {
  const inner = (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: pressed ? colors.stone100 : colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border })}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={[styles.text, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
  return href ? <Link href={href as never} asChild>{inner}</Link> : inner;
}

export default function Menu() {
  const { profile, org, signOut } = useAuth();
  const [now] = useState(() => Date.now());
  const publicUrl = org ? `${WEB_URL}/p/${org.slug}` : null;
  const daysLeft = org?.billing_due_at ? Math.ceil((new Date(org.billing_due_at).getTime() - now) / 86_400_000) : null;

  return (
    <Screen padded={false}>
      <View style={{ padding: 16, gap: 12 }}>
        <Card>
          <Text style={styles.cardTitle}>{org?.name}</Text>
          <Muted>{profile?.name} · {profile?.role === "owner" ? "Proprietário" : "Equipe"} · {profile?.email}</Muted>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <Badge tone={org?.plan === "premium" ? "brand" : "zinc"}>{org?.plan === "premium" ? "Premium" : "Básico"}</Badge>
            {daysLeft != null ? <Muted>Fatura vence em {daysLeft} d ({formatDate(org!.billing_due_at!)})</Muted> : null}
          </View>
        </Card>
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.border }}>
        <Item icon="notifications-outline" label="Notificações" href="/(app)/notificacoes" />
        {publicUrl ? <Item icon="share-outline" label="Compartilhar minha página pública" onPress={() => Share.share({ message: publicUrl })} /> : null}
        {publicUrl ? <Item icon="globe-outline" label="Abrir minha página pública" onPress={() => Linking.openURL(publicUrl)} /> : null}
        <Item icon="laptop-outline" label="Festeja na web (configurações, pacotes, contratos)" onPress={() => Linking.openURL(`${WEB_URL}/home`)} />
        <Item icon="people-outline" label="Entrar como cliente (testar)" href="/entrar" />
      </View>
      <View style={{ padding: 16 }}>
        <Button title="Sair" variant="outline" onPress={async () => { await signOut(); router.replace("/entrar"); }} />
        <Muted style={{ textAlign: "center", marginTop: 16 }}>Festeja · desenvolvido por AraLabs</Muted>
      </View>
    </Screen>
  );
}
