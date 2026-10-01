import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Linking, Text, View } from "react-native";
import { confirmGuest, loadGuestLink } from "@/lib/client";
import { formatDateLong, formatTime, whatsappUrl } from "@/lib/format";
import { Button, Card, CardTitle, Empty, Field, Input, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Convite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const q = useQuery({ queryKey: ["guest-link", token], queryFn: () => loadGuestLink(token) });
  const [name, setName] = useState("");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const m = useMutation({ mutationFn: () => confirmGuest(token, name, Number(adults) || 0, Number(children) || 0, notes), onSuccess: () => setDone(true) });

  if (q.isLoading) return <Loading />;
  const d = q.data;
  if (!d) return <Screen><Empty title="Convite não encontrado" description="O link pode ter sido desativado." /></Screen>;
  const { event: ev, org } = d;

  return (
    <Screen>
      {ev.invite_image_url ? <Image alt="Convite" source={{ uri: ev.invite_image_url }} style={{ width: "100%", aspectRatio: 1, borderRadius: 16, backgroundColor: colors.stone100 }} resizeMode="cover" /> : null}
      <Card>
        <Text style={[styles.title, { textAlign: "center" }]}>{ev.invite_title || ev.title || `Festa de ${ev.customer_name}`}</Text>
        {ev.invite_message ? <Text style={[styles.text, { textAlign: "center" }]}>{ev.invite_message}</Text> : null}
        <Text style={[styles.text, { textAlign: "center", fontWeight: "600" }]}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</Text>
        <Muted style={{ textAlign: "center" }}>{org.name}{org.address ? ` · ${org.address}` : ""}</Muted>
        {ev.celebrant_name ? <Muted style={{ textAlign: "center" }}>Aniversariante: {ev.celebrant_name}{ev.celebrant_age != null ? `, ${ev.celebrant_age} anos` : ""}</Muted> : null}
      </Card>
      {ev.status === "CANCELLED" ? <Empty title="Este evento foi cancelado" /> : d.expired ? <Empty title="O prazo de confirmação encerrou" /> : done ? (
        <Card tone="brand"><Text style={styles.cardTitle}>Presença confirmada. Obrigado!</Text><Muted>Nos vemos na festa.</Muted></Card>
      ) : (
        <Card>
          <CardTitle title="Confirmar presença" />
          <Field label="Seu nome (ou da família)"><Input value={name} onChangeText={setName} placeholder="Ex.: Família Souza" /></Field>
          <Row>
            <View style={{ flex: 1 }}><Field label="Adultos"><Input value={adults} onChangeText={setAdults} keyboardType="number-pad" /></Field></View>
            <View style={{ flex: 1 }}><Field label="Crianças"><Input value={children} onChangeText={setChildren} keyboardType="number-pad" /></Field></View>
          </Row>
          <Field label="Observação (opcional)"><Input value={notes} onChangeText={setNotes} placeholder="Alergias, cadeirante…" /></Field>
          {m.error ? <Text style={{ color: colors.red }}>{m.error.message}</Text> : null}
          <Button title="Confirmar presença" onPress={() => m.mutate()} loading={m.isPending} />
        </Card>
      )}
      {org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="outline" onPress={() => Linking.openURL(whatsappUrl(org.whatsapp!))} /> : null}
    </Screen>
  );
}
