import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatTime, hoursLeft, whatsappUrl } from "@/lib/format";
import { eventTitle, loadHome, type EventRow } from "@/lib/queries";
import { confirmEventRemote } from "@/lib/confirm";
import { supabase } from "@/lib/supabase";
import { Button, Card, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { buildTodos } from "./(tabs)/home";

/** Everything in "A fazer agora", when the home shows only the first three. */
export default function Pendencias() {
  const { org } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["home"], queryFn: loadHome });
  const todos = q.data ? buildTodos(q.data) : [];

  async function act(e: EventRow, status: "CONFIRMED" | "QUOTE") {
    try {
      if (status === "CONFIRMED") await confirmEventRemote(e.id, { confirm: true });
      else await supabase.from("events").update({ status, expires_at: null }).eq("id", e.id);
    } catch (err) {
      Alert.alert("Confirmar", (err as Error).message);
    }
    qc.invalidateQueries({ queryKey: ["home"] });
  }
  const openEvent = (e: EventRow) => router.push({ pathname: "/(app)/eventos/[id]", params: { id: e.id } });

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {!q.data ? <Loading /> : todos.length === 0 ? <Empty title="Tudo em dia" description="Nada esperando você." /> : todos.map((t) => (
        <Card key={t.e.id + t.kind}>
          <Pressable onPress={() => openEvent(t.e)}>
            <Text style={styles.h3}>{t.kind === "confirm" ? "Data aguardando confirmação" : "Saldo vence antes da festa"}</Text>
            <Muted>{eventTitle(t.e)} · {formatDate(t.e.starts_at)} {formatTime(t.e.starts_at)}{t.kind === "confirm" ? ` · vence em ${hoursLeft(t.e.expires_at)}h` : ` · falta ${formatCurrency(t.balance)}`}</Muted>
          </Pressable>
          <Row style={{ flexWrap: "wrap" }}>
            {t.kind === "confirm" ? (
              <>
                {t.e.pix_txid ? <Button title="Ver Pix" size="sm" variant="outline" onPress={() => openEvent(t.e)} /> : <Button title="Confirmar" size="sm" onPress={() => act(t.e, "CONFIRMED")} />}
                <Button title="Liberar data" size="sm" variant="ghost" onPress={() => act(t.e, "QUOTE")} />
                {t.e.customers ? <Button title="WhatsApp" size="sm" variant="secondary" onPress={() => Linking.openURL(whatsappUrl(t.e.customers!.whatsapp, `Olá ${t.e.customers!.name.split(" ")[0]}! Aqui é do ${org?.name}. Sobre a reserva de ${formatDate(t.e.starts_at)}.`))} /> : null}
              </>
            ) : (
              <Button title="Cobrar no WhatsApp" size="sm" onPress={() => openEvent(t.e)} />
            )}
          </Row>
          <View />
        </Card>
      ))}
    </Screen>
  );
}
