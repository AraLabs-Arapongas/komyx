import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useParty } from "@/lib/party-context";
import { Alert, Image, Linking, Share, Text, View } from "react-native";
import { formatDateLong, formatPhone, formatTime } from "@/lib/format";
import { useReservationView } from "@/lib/reservation-view";
import { KomyxMark } from "@/ui/brand";
import { Button, Card, CardTitle, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

/** Where and when: the buffet's address, directions, a shareable location and the contact. */
export default function Local() {
  const { token, ready } = useParty();
  const { q, view } = useReservationView(token ?? "");
  if (!ready || (token && q.isLoading)) return <Loading />;
  if (!token) return <Screen><Empty title="Escolha uma festa" description="Em Início, toque na festa que você quer acompanhar." /><Button title="Ir para Início" variant="secondary" onPress={() => router.replace("/cliente")} /></Screen>;
  if (!view) return <Screen><Empty title="Reserva não encontrada" /></Screen>;
  const { ev, org, address, mapsUrl } = view;
  const shareText = `${view.title} · ${formatDateLong(ev.starts_at)} às ${formatTime(ev.starts_at)}\n${org.name}${address ? ` · ${address}` : ""}${mapsUrl ? `\n${mapsUrl}` : ""}`;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()} resetScrollKey={token}>
      <Card>
        <Row>
          {org.logo_url ? <Image alt="" source={{ uri: org.logo_url }} style={{ width: 56, height: 56, borderRadius: 16 }} /> : <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><KomyxMark size={32} color={colors.brand} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{org.name}</Text>
            {address ? <Text style={styles.text}>{address}</Text> : <Muted>Endereço não informado pelo buffet.</Muted>}
          </View>
        </Row>
        {mapsUrl ? <Button title="Como chegar" icon={<Ionicons name="navigate-outline" size={18} color="#fff" />} onPress={() => Linking.openURL(mapsUrl)} /> : null}
        <Row>
          <Button title="Compartilhar local" size="sm" variant="outline" style={{ flex: 1 }} icon={<Ionicons name="share-outline" size={16} color={colors.foreground} />} onPress={() => Share.share({ message: shareText })} />
          {address ? <Button title="Copiar endereço" size="sm" variant="outline" style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(address); Alert.alert("Copiado"); }} /> : null}
        </Row>
      </Card>
      <Card>
        <CardTitle title="Quando" />
        <Row>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", lineHeight: 24 }}>{new Date(ev.starts_at).getDate()}</Text>
            <Text style={{ color: colors.sun, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{formatDateLong(ev.starts_at).split(" de ")[1]?.slice(0, 3)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.text, { fontWeight: "700" }]}>{formatDateLong(ev.starts_at)}</Text>
            <Text style={styles.text}>{formatTime(ev.starts_at)} às {formatTime(ev.ends_at)}</Text>
            <Muted>Combine com o buffet se quiser chegar antes para decorar.</Muted>
          </View>
        </Row>
      </Card>
      {org.whatsapp ? (
        <Card>
          <CardTitle title="Contato do buffet" subtitle={formatPhone(org.whatsapp.replace(/^\+?55/, ""))} />
          <Button title="Falar no WhatsApp" variant="secondary" icon={<Ionicons name="logo-whatsapp" size={18} color={colors.brandDeep} />} onPress={() => view.wa(`Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}.`)} />
        </Card>
      ) : null}
    </Screen>
  );
}
