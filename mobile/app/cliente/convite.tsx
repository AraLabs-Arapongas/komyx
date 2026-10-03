import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useParty } from "@/lib/party-context";
import { Image, Linking, Share, Text } from "react-native";
import { formatDateLong, formatTime } from "@/lib/format";
import { useReservationView } from "@/lib/reservation-view";
import { Button, Card, CardTitle, Empty, Loading, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

/** How the invite looks to a guest, plus the two actions: personalize it (web editor) and send it. */
export default function Convite() {
  const { token, ready } = useParty();
  const { q, view } = useReservationView(token ?? "");
  if (!ready || (token && q.isLoading)) return <Loading />;
  if (!token) return <Screen><Empty title="Escolha uma festa" description="Em Início, toque na festa que você quer acompanhar." /><Button title="Ir para Início" variant="secondary" onPress={() => router.replace("/cliente")} /></Screen>;
  if (!view) return <Screen><Empty title="Reserva não encontrada" /></Screen>;
  const { ev, org, guestUrl, inviteEditUrl } = view;
  const personalized = Boolean(ev.invite_title || ev.invite_message || ev.invite_image_url);
  const message = `Você está convidado: ${ev.invite_title || view.title} · ${formatDateLong(ev.starts_at)} às ${formatTime(ev.starts_at)}${org.address ? ` · ${org.name}, ${org.address}` : ""}.${guestUrl ? ` Confirme presença: ${guestUrl}` : ""}`;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {ev.invite_image_url ? <Image alt="Convite" source={{ uri: ev.invite_image_url }} style={{ width: "100%", aspectRatio: 1, borderRadius: 20, backgroundColor: colors.stone100 }} resizeMode="cover" /> : null}
      <Card tone={personalized ? undefined : "amber"}>
        <Text style={[styles.title, { textAlign: "center" }]}>{ev.invite_title || view.title}</Text>
        {ev.invite_message ? <Text style={[styles.text, { textAlign: "center" }]}>{ev.invite_message}</Text> : null}
        <Text style={[styles.text, { textAlign: "center", fontWeight: "600" }]}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</Text>
        <Muted style={{ textAlign: "center" }}>{org.name}{org.address ? ` · ${org.address}` : ""}</Muted>
        {ev.celebrant_name ? <Muted style={{ textAlign: "center" }}>Aniversariante: {ev.celebrant_name}{ev.celebrant_age != null ? `, ${ev.celebrant_age} anos` : ""}</Muted> : null}
        {!personalized ? <Muted style={{ textAlign: "center", color: colors.amber }}>Ainda sem foto e mensagem. Personalize para os convidados verem a cara da festa.</Muted> : null}
      </Card>
      <Card>
        <CardTitle title="Enviar aos convidados" subtitle="Eles abrem o convite, veem o local e confirmam presença pelo link." />
        {guestUrl ? <Button title="Compartilhar convite" icon={<Ionicons name="share-outline" size={18} color="#fff" />} onPress={() => Share.share({ message })} /> : <Muted>O buffet ainda não liberou o link de confirmação.</Muted>}
        {guestUrl ? <Button title="Ver como o convidado vê" variant="outline" onPress={() => Linking.openURL(guestUrl)} /> : null}
        {inviteEditUrl ? <Button title={personalized ? "Editar foto e mensagem" : "Personalizar o convite"} variant={personalized ? "ghost" : "secondary"} onPress={() => Linking.openURL(inviteEditUrl)} /> : null}
      </Card>
    </Screen>
  );
}
