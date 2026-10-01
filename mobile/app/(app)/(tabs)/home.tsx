import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack, router } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateLong, formatPhone, formatTime, hoursLeft, whatsappUrl } from "@/lib/format";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from "@/lib/labels";
import { eventTitle, loadHome, unreadNotifications, type EventRow } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, CardTitle, Empty, Loading, Muted, Row, Screen, Stat, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Home() {
  const { profile, org } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["home"], queryFn: loadHome });
  const unread = useQuery({ queryKey: ["unread"], queryFn: unreadNotifications, refetchInterval: 60_000 });
  const d = q.data;

  async function act(e: EventRow, status: "CONFIRMED" | "QUOTE") {
    await supabase.from("events").update(status === "CONFIRMED" ? { status, expires_at: null } : { status, expires_at: null }).eq("id", e.id);
    qc.invalidateQueries({ queryKey: ["home"] });
  }

  const urgent = d ? d.expiring.length + d.online.length : 0;

  return (
    <>
      <Stack.Screen options={{ title: `Olá, ${profile?.name.split(" ")[0] ?? ""}`, headerRight: () => (
        <Pressable onPress={() => router.push("/(app)/notificacoes")} style={{ padding: 6 }}>
          <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
          {unread.data ? <View style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unread.data}</Text></View> : null}
        </Pressable>
      ) }} />
      <Screen refreshing={q.isFetching} onRefresh={() => { q.refetch(); unread.refetch(); }}>
        <Muted>{formatDateLong(new Date())} · {org?.name}</Muted>
        {!d ? <Loading /> : (
          <>
            <Text style={styles.text}>
              <Text style={{ fontWeight: "700" }}>Hoje:</Text> {d.today.length} evento{d.today.length === 1 ? "" : "s"} · {urgent} {urgent === 1 ? "ação urgente" : "ações urgentes"} · {d.requests.length} {d.requests.length === 1 ? "nova solicitação" : "novas solicitações"}
            </Text>

            {urgent > 0 ? (
              <Card tone="amber">
                <CardTitle title="Ação urgente" subtitle="Reservas aguardando confirmação: confirme ou libere a data" />
                {[...d.online, ...d.expiring].map((e) => (
                  <View key={e.id} style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#fde68a" }}>
                    <Link href={{ pathname: "/(app)/eventos/[id]", params: { id: e.id } }} asChild>
                      <Pressable>
                        <Text style={styles.h3}>{eventTitle(e)} {e.origin === "SELF_SERVICE" ? "· reserva online" : ""}</Text>
                        <Muted>{formatDate(e.starts_at)} {formatTime(e.starts_at)} · {e.customers?.name} · vence em {hoursLeft(e.expires_at)}h</Muted>
                      </Pressable>
                    </Link>
                    <Row>
                      {e.pix_txid ? (
                        <Button title="Ver Pix" size="sm" variant="outline" onPress={() => router.push({ pathname: "/(app)/eventos/[id]", params: { id: e.id } })} />
                      ) : (
                        <Button title="Confirmar" size="sm" onPress={() => act(e, "CONFIRMED")} />
                      )}
                      <Button title="Liberar data" size="sm" variant="ghost" onPress={() => act(e, "QUOTE")} />
                      {e.customers ? <Button title="WhatsApp" size="sm" variant="secondary" onPress={() => Linking.openURL(whatsappUrl(e.customers!.whatsapp, `Olá ${e.customers!.name.split(" ")[0]}! Aqui é do ${org?.name}. Sobre a reserva de ${formatDate(e.starts_at)}.`))} /> : null}
                    </Row>
                  </View>
                ))}
              </Card>
            ) : null}

            {d.requests.length ? (
              <Card>
                <CardTitle title="Novas solicitações" right={<Link href="/(app)/(tabs)/solicitacoes"><Text style={{ color: colors.brand, fontWeight: "600" }}>Ver todas</Text></Link>} />
                {d.requests.map((r) => (
                  <View key={r.id} style={{ gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={styles.h3}>{r.name} <Muted>· {formatPhone(r.whatsapp)}</Muted></Text>
                    <Muted>{r.desired_date ? `${r.desired_date.split("-").reverse().join("/")}${r.desired_time ? ` ${String(r.desired_time).slice(0, 5)}` : ""}` : "sem data"} · {(r.adults ?? 0) + (r.children ?? 0) || r.participants || "?"} pessoas</Muted>
                    {r.message ? <Text style={styles.text} numberOfLines={2}>“{r.message}”</Text> : null}
                    <Button title="Responder no WhatsApp" size="sm" variant="secondary" onPress={() => Linking.openURL(whatsappUrl(r.whatsapp, `Olá ${r.name.split(" ")[0]}! Aqui é do ${org?.name}. Recebemos seu pedido de orçamento.`))} />
                  </View>
                ))}
              </Card>
            ) : null}

            <Card>
              <CardTitle title="Hoje" />
              {d.today.length === 0 ? <Muted>Nenhum evento hoje.</Muted> : d.today.map((e) => <EventLine key={e.id} e={e} balance={d.fin.get(e.id)?.balance} />)}
            </Card>

            <Card>
              <CardTitle title="Próximos 7 dias" />
              {d.week.length === 0 ? <Muted>Semana livre.</Muted> : d.week.map((e) => <EventLine key={e.id} e={e} balance={d.fin.get(e.id)?.balance} />)}
            </Card>

            <Card>
              <CardTitle title="A receber" />
              <Row>
                <Stat label="Atrasado" value={formatCurrency(d.receivables.overdue)} />
                <Stat label="7 dias" value={formatCurrency(d.receivables.dueWeek)} />
                <Stat label="Total" value={formatCurrency(d.receivables.total)} strong />
              </Row>
            </Card>
            {d.today.length + d.week.length + d.requests.length + urgent === 0 ? <Empty title="Tudo em dia" description="Nada pendente por aqui." /> : null}
          </>
        )}
      </Screen>
    </>
  );
}

export function EventLine({ e, balance }: { e: EventRow; balance?: number }) {
  return (
    <Link href={{ pathname: "/(app)/eventos/[id]", params: { id: e.id } }} asChild>
      <Pressable style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 3 }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={styles.h3} numberOfLines={1}>{eventTitle(e)}</Text>
          <Badge tone={EVENT_STATUS_TONE[e.status]}>{EVENT_STATUS_LABEL[e.status]}</Badge>
        </Row>
        <Muted>{formatDateLong(e.starts_at)} · {formatTime(e.starts_at)}–{formatTime(e.ends_at)} · {(e.adults ?? 0) + (e.children ?? 0)} pessoas{balance != null && balance > 0 ? ` · falta ${formatCurrency(balance)}` : ""}</Muted>
      </Pressable>
    </Link>
  );
}
