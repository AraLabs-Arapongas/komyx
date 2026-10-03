import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useParty } from "@/lib/party-context";
import { useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import { formatCurrency, formatDateLong, formatTime } from "@/lib/format";
import { useReservationView } from "@/lib/reservation-view";
import { Button, Card, CardTitle, Divider, Empty, Field, Input, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Convidados() {
  const { token, ready } = useParty();
  const { q, view, ask, addGuest, removeGuest } = useReservationView(token ?? "", { refetchOnFocus: true });
  const [guestName, setGuestName] = useState("");
  const [guestAdults, setGuestAdults] = useState("2");
  const [guestChildren, setGuestChildren] = useState("0");
  if (!ready || (token && q.isLoading)) return <Loading />;
  if (!token) return <Screen><Empty title="Escolha uma festa" description="Em Início, toque na festa que você quer acompanhar." /><Button title="Ir para Início" variant="secondary" onPress={() => router.replace("/cliente")} /></Screen>;
  if (!view) return <Screen><Empty title="Reserva não encontrada" /></Screen>;
  const { r, ev, showPrices, guestsPeople, pending, first, guestUrl, capacity: c } = view;
  const pct = (n: number, t: number) => (t > 0 ? Math.min(100, Math.round((n / t) * 100)) : 0);
  const pendingPeople = pending.some((x) => x.kind === "PEOPLE");
  const over = c.overA + c.overC;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()} resetScrollKey={token}>
      <Card>
        <CardTitle title="Quantos cabem" subtitle={`${r.guests.length} ${r.guests.length === 1 ? "confirmação" : "confirmações"} · ${guestsPeople} pessoas`} />
        <View style={{ gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.stone50, borderWidth: 1, borderColor: colors.border }}>
          {([["Adultos", c.contractedA, c.confA, c.leftA, c.overA], ["Crianças", c.contractedC, c.confC, c.leftC, c.overC]] as const).map(([label, t, n, left, ov]) => (
            <View key={label} style={{ gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.text}>{label}: <Text style={{ fontWeight: "700" }}>{n}</Text> de {t} contratados</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: ov > 0 ? colors.red : left > 0 ? colors.muted : colors.green }}>{ov > 0 ? `${ov} a mais` : left > 0 ? `faltam ${left}` : "completo"}</Text>
              </Row>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}><View style={{ height: "100%", width: `${pct(n, t)}%`, backgroundColor: ov > 0 ? colors.red : colors.green }} /></View>
            </View>
          ))}
          {over > 0 ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.amber, fontSize: 13 }}>
                {c.overA > 0 ? `${c.overA} adulto${c.overA > 1 ? "s" : ""}` : ""}{c.overA > 0 && c.overC > 0 ? " e " : ""}{c.overC > 0 ? `${c.overC} criança${c.overC > 1 ? "s" : ""}` : ""} além do contratado
                {showPrices && c.overCost > 0 ? ` · extra estimado ${formatCurrency(c.overCost)}${c.priceA ? ` (adulto ${formatCurrency(c.priceA)}` : ""}${c.priceA && c.priceC ? ", " : c.priceA ? ")" : ""}${c.priceC ? `${c.priceA ? "" : " ("}criança ${formatCurrency(c.priceC)})` : ""}` : ""}.
              </Text>
              <Button title={pendingPeople ? "Pedido de inclusão enviado" : `Pedir ao buffet para incluir ${over} pessoa${over > 1 ? "s" : ""}`} size="sm" variant="secondary" disabled={pendingPeople} loading={ask.isPending} onPress={() => ask.mutate({ kind: "PEOPLE", message: `${first} pediu para incluir ${c.confA} adultos e ${c.confC} crianças (contratado: ${c.contractedA} e ${c.contractedC}).`, payload: { adults: c.confA, children: c.confC, over_adults: c.overA, over_children: c.overC, estimated_extra: c.overCost } })} />
            </View>
          ) : c.leftA + c.leftC > 0 ? <Muted>Ainda cabem {c.leftA > 0 ? `${c.leftA} adulto${c.leftA > 1 ? "s" : ""}` : ""}{c.leftA > 0 && c.leftC > 0 ? " e " : ""}{c.leftC > 0 ? `${c.leftC} criança${c.leftC > 1 ? "s" : ""}` : ""} no que você contratou.</Muted> : <Muted>Lista completa dentro do contratado.</Muted>}
        </View>
        {guestUrl ? <Button title="Enviar link de confirmação aos convidados" icon={<Ionicons name="share-outline" size={18} color="#fff" />} onPress={() => Share.share({ message: `Você está convidado: ${view.title} · ${formatDateLong(ev.starts_at)} às ${formatTime(ev.starts_at)}. Confirme presença: ${guestUrl}` })} /> : null}
      </Card>

      <Card>
        <CardTitle title="Lista" subtitle={r.guests.length ? "Quem já confirmou" : "Ninguém confirmou ainda"} />
        {r.guests.map((g) => (
          <Row key={g.id} style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{g.name} <Muted>· {g.adults}A {g.children}C</Muted></Text>
              <Muted style={{ fontSize: 11 }}>{g.checked_in ? "chegou na festa" : g.source === "PUBLIC" ? "confirmou pelo link" : g.source === "CLIENT" ? "você adicionou" : "adicionado pelo buffet"}</Muted>
            </View>
            {!g.checked_in ? <Pressable onPress={() => Alert.alert("Remover convidado", `Tirar ${g.name} da lista?`, [{ text: "Cancelar", style: "cancel" }, { text: "Remover", style: "destructive", onPress: () => removeGuest.mutate(g.id) }])} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable> : null}
          </Row>
        ))}
        {r.guests.length ? <Divider /> : null}
        <Text style={styles.h3}>Adicionar convidado</Text>
        <Field label="Nome"><Input value={guestName} onChangeText={setGuestName} placeholder="Ex.: Tia Lúcia" autoCapitalize="words" /></Field>
        <Row style={{ alignItems: "flex-end" }}>
          <Field label="Adultos"><Input value={guestAdults} onChangeText={(v: string) => setGuestAdults(v.replace(/\D/g, ""))} keyboardType="number-pad" style={{ width: 76, textAlign: "center" }} /></Field>
          <Field label="Crianças"><Input value={guestChildren} onChangeText={(v: string) => setGuestChildren(v.replace(/\D/g, ""))} keyboardType="number-pad" style={{ width: 76, textAlign: "center" }} /></Field>
          <View style={{ flex: 1, justifyContent: "flex-end" }}><Button title="Adicionar" style={{ height: 48, borderRadius: 14 }} loading={addGuest.isPending} disabled={guestName.trim().length < 2} onPress={() => addGuest.mutate({ name: guestName, adults: Number(guestAdults) || 0, children: Number(guestChildren) || 0 }, { onSuccess: () => { setGuestName(""); setGuestAdults("2"); setGuestChildren("0"); } })} /></View>
        </Row>
      </Card>
    </Screen>
  );
}
