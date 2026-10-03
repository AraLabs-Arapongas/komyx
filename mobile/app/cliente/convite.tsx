import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, Share, Text, View } from "react-native";
import { formatDateLong, formatTime } from "@/lib/format";
import { pickInvitePhoto, saveInvite } from "@/lib/invite";
import { useParty } from "@/lib/party-context";
import { useReservationView } from "@/lib/reservation-view";
import { openWeb } from "@/lib/web";
import { Button, Card, CardTitle, Empty, Field, Input, Loading, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

/**
 * The invite as the guest sees it, editable right here: photo (picked and shrunk on the phone),
 * title and message. Sharing sends the guest confirmation link.
 */
export default function Convite() {
  const { token, ready } = useParty();
  const { q, view, invalidate } = useReservationView(token ?? "", { refetchOnFocus: true });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const ev = view?.ev;

  if (!ready || (token && q.isLoading)) return <Loading />;
  if (!token) return <Screen><Empty title="Escolha uma festa" description="Em Início, toque na festa que você quer acompanhar." /><Button title="Ir para Início" variant="secondary" onPress={() => router.replace("/cliente")} /></Screen>;
  if (!view || !ev) return <Screen><Empty title="Reserva não encontrada" /></Screen>;
  const { org, guestUrl, inviteEditUrl, r } = view;
  const inviteToken = r.invite_token;
  const personalized = Boolean(ev.invite_title || ev.invite_message || ev.invite_image_url);
  const shareText = `Você está convidado: ${ev.invite_title || view.title} · ${formatDateLong(ev.starts_at)} às ${formatTime(ev.starts_at)}${org.address ? ` · ${org.name}, ${org.address}` : ""}.${guestUrl ? ` Confirme presença: ${guestUrl}` : ""}`;

  async function changePhoto() {
    if (!inviteToken) return;
    try {
      const picked = await pickInvitePhoto();
      if (!picked) return;
      setUploading(true);
      await saveInvite(inviteToken, { photoUri: picked.uri });
      await invalidate();
    } catch (e) {
      Alert.alert("Foto do convite", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function saveText() {
    if (!inviteToken) return;
    setSaving(true);
    try {
      await saveInvite(inviteToken, { title: title.trim(), message: message.trim() });
      await invalidate();
      setEditing(false);
    } catch (e) {
      Alert.alert("Convite", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()} resetScrollKey={token}>
      <Pressable onPress={inviteToken ? changePhoto : undefined} disabled={uploading} style={{ borderRadius: 20, overflow: "hidden", backgroundColor: colors.stone100, borderWidth: ev.invite_image_url ? 0 : 1.5, borderStyle: ev.invite_image_url ? "solid" : "dashed", borderColor: colors.border }}>
        {ev.invite_image_url ? <Image alt="Convite" source={{ uri: ev.invite_image_url }} style={{ width: "100%", aspectRatio: 4 / 3 }} resizeMode="cover" /> : (
          <View style={{ aspectRatio: 4 / 3, alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ionicons name="image-outline" size={40} color={colors.dim} />
            <Text style={[styles.text, { color: colors.muted }]}>Toque para escolher a arte do convite</Text>
          </View>
        )}
        {inviteToken ? (
          <View style={{ position: "absolute", right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(27,31,58,0.78)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}>
            <Ionicons name={uploading ? "cloud-upload-outline" : "camera-outline"} size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{uploading ? "Enviando…" : ev.invite_image_url ? "Trocar foto" : "Escolher foto"}</Text>
          </View>
        ) : null}
      </Pressable>

      {guestUrl ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Enviar convite" style={{ flex: 1.4 }} icon={<Ionicons name="logo-whatsapp" size={18} color="#fff" />} onPress={() => Share.share({ message: shareText })} />
          <Button title="Prévia" variant="outline" style={{ flex: 1 }} icon={<Ionicons name="eye-outline" size={18} color={colors.foreground} />} onPress={() => openWeb(guestUrl, "Convite")} />
        </View>
      ) : <Muted style={{ textAlign: "center" }}>O buffet ainda não liberou o link de confirmação.</Muted>}

      {editing ? (
        <Card>
          <CardTitle title="Texto do convite" />
          <Field label="Título"><Input value={title} onChangeText={setTitle} placeholder={view.title} /></Field>
          <Field label="Mensagem para os convidados"><Input value={message} onChangeText={setMessage} placeholder="Ex.: Venha comemorar com a gente! Confirme até dia 20." multiline style={{ height: 96, textAlignVertical: "top", paddingTop: 12 }} /></Field>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Cancelar" variant="ghost" style={{ flex: 1 }} onPress={() => { setEditing(false); setTitle(ev.invite_title ?? ""); setMessage(ev.invite_message ?? ""); }} />
            <Button title="Salvar" style={{ flex: 1 }} loading={saving} onPress={saveText} />
          </View>
        </Card>
      ) : (
        <Card tone={personalized ? undefined : "amber"}>
          <Text style={[styles.title, { textAlign: "center" }]}>{ev.invite_title || view.title}</Text>
          {ev.invite_message ? <Text style={[styles.text, { textAlign: "center" }]}>{ev.invite_message}</Text> : null}
          <Text style={[styles.text, { textAlign: "center", fontWeight: "600" }]}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</Text>
          <Muted style={{ textAlign: "center" }}>{org.name}{org.address ? ` · ${org.address}` : ""}</Muted>
          {ev.celebrant_name ? <Muted style={{ textAlign: "center" }}>Aniversariante: {ev.celebrant_name}{ev.celebrant_age != null ? `, ${ev.celebrant_age} anos` : ""}</Muted> : null}
          {!personalized ? <Muted style={{ textAlign: "center", color: colors.amber }}>Ainda sem foto e mensagem. Personalize para os convidados verem a cara da festa.</Muted> : null}
          {inviteToken ? <Button title={ev.invite_title || ev.invite_message ? "Editar título e mensagem" : "Escrever título e mensagem"} variant="outline" size="sm" icon={<Ionicons name="create-outline" size={16} color={colors.foreground} />} onPress={() => { setTitle(ev.invite_title ?? ""); setMessage(ev.invite_message ?? ""); setEditing(true); }} /> : null}
        </Card>
      )}

      <Muted style={{ textAlign: "center", paddingHorizontal: 12 }}>Quem recebe o link vê o convite, o local e confirma presença. As confirmações aparecem em Convidados.</Muted>
      {inviteEditUrl ? <Button title="Editar no site" variant="ghost" size="sm" onPress={() => openWeb(inviteEditUrl, "Personalizar convite")} /> : null}
    </Screen>
  );
}
