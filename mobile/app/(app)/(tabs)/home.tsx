import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateLong, formatTime, hoursLeft, toDateKey, whatsappUrl } from "@/lib/format";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from "@/lib/labels";
import { eventTitle, loadHome, unreadNotifications, type EventRow } from "@/lib/queries";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Badge, Button, Card, CardTitle, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { party } from "@/ui/party";
import { colors } from "@/ui/theme";

/**
 * Owner home = command center, not a dashboard. Only what needs her now: dates awaiting
 * confirmation, balances due before the party, new requests, today's party and upcoming parties
 * that still have something pending. No totals, no charts, no "0 eventos".
 */
export type Todo =
  | { kind: "confirm"; e: EventRow }
  | { kind: "charge"; e: EventRow; balance: number };

export function buildTodos(d: Awaited<ReturnType<typeof loadHome>>): Todo[] {
  const confirm: Todo[] = [...d.online, ...d.expiring].map((e) => ({ kind: "confirm", e }));
  const charge: Todo[] = [...d.today, ...d.week]
    .filter((e) => e.status === "CONFIRMED" && (d.fin.get(e.id)?.balance ?? 0) > 0)
    .map((e) => ({ kind: "charge", e, balance: d.fin.get(e.id)!.balance }));
  return [...confirm, ...charge];
}

export default function Home() {
  const { profile, org } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["home"], queryFn: loadHome });
  const unread = useQuery({ queryKey: ["unread"], queryFn: unreadNotifications, refetchInterval: 60_000 });
  const d = q.data;

  async function act(e: EventRow, status: "CONFIRMED" | "QUOTE") {
    await supabase.from("events").update({ status, expires_at: null }).eq("id", e.id);
    qc.invalidateQueries({ queryKey: ["home"] });
  }

  async function openDoor(e: EventRow) {
    const { data } = await supabase.from("public_links").select("short").eq("event_id", e.id).eq("type", "CHECKIN").eq("active", true).limit(1);
    let short = data?.[0]?.short as string | undefined;
    if (!short) {
      const { data: c } = await supabase.from("public_links").insert({ organization_id: profile!.organization_id, event_id: e.id, type: "CHECKIN", created_by: profile!.id }).select("short").single();
      short = c?.short as string | undefined;
    }
    if (short) Linking.openURL(`${WEB_URL}/o/${short}`);
  }

  const wa = (e: EventRow, msg: string) => e.customers && Linking.openURL(whatsappUrl(e.customers.whatsapp, `Olá ${e.customers.name.split(" ")[0]}! Aqui é do ${org?.name}. ${msg}`));
  const openEvent = (e: EventRow) => router.push({ pathname: "/(app)/eventos/[id]", params: { id: e.id } });

  const todos = d ? buildTodos(d) : [];
  const todayKey = toDateKey(new Date());
  const today = d?.today[0];
  const upcoming = d ? d.week.filter((e) => toDateKey(e.starts_at) !== todayKey && (e.status === "PRE_RESERVED" || (d.fin.get(e.id)?.balance ?? 0) > 0)) : [];
  const quiet = d && todos.length === 0 && d.requests.length === 0 && !today && upcoming.length === 0;

  return (
    <>
      <Stack.Screen options={{ title: "Início", headerRight: () => (
        <Pressable onPress={() => router.push("/(app)/notificacoes")} style={{ padding: 6 }}>
          <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
          {unread.data ? <View style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{unread.data}</Text></View> : null}
        </Pressable>
      ) }} />
      <Screen refreshing={q.isFetching} onRefresh={() => { q.refetch(); unread.refetch(); }}>
        <Muted>{formatDateLong(new Date())} · {org?.name}</Muted>
        {!d ? <Loading /> : (
          <>
            {/* A FAZER AGORA (max 3) */}
            {todos.length > 0 ? (
              <Card tone="amber">
                <CardTitle title="A fazer agora" right={todos.length > 3 ? <Pressable onPress={() => router.push("/(app)/pendencias")}><Text style={{ color: colors.brand, fontWeight: "600" }}>Ver todas ({todos.length})</Text></Pressable> : undefined} />
                {todos.slice(0, 3).map((t) => (
                  <View key={t.e.id + t.kind} style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#fde68a" }}>
                    <Pressable onPress={() => openEvent(t.e)}>
                      <Text style={styles.h3}>{t.kind === "confirm" ? "Data aguardando confirmação" : "Saldo vence antes da festa"}</Text>
                      <Muted>{eventTitle(t.e)} · {formatDate(t.e.starts_at)} {formatTime(t.e.starts_at)}{t.kind === "confirm" ? ` · vence em ${hoursLeft(t.e.expires_at)}h${t.e.origin === "SELF_SERVICE" ? " · reserva online" : ""}` : ` · falta ${formatCurrency(t.balance)}`}</Muted>
                    </Pressable>
                    <Row style={{ flexWrap: "wrap" }}>
                      {t.kind === "confirm" ? (
                        <>
                          {t.e.pix_txid ? <Button title="Ver Pix" size="sm" variant="outline" onPress={() => openEvent(t.e)} /> : <Button title="Confirmar" size="sm" onPress={() => act(t.e, "CONFIRMED")} />}
                          <Button title="Liberar data" size="sm" variant="ghost" onPress={() => act(t.e, "QUOTE")} />
                          <Button title="WhatsApp" size="sm" variant="secondary" onPress={() => wa(t.e, `Sobre a reserva de ${formatDate(t.e.starts_at)}.`)} />
                        </>
                      ) : (
                        <Button title="Cobrar no WhatsApp" size="sm" onPress={() => openEvent(t.e)} />
                      )}
                    </Row>
                  </View>
                ))}
              </Card>
            ) : null}

            {/* NOVAS SOLICITAÇÕES */}
            {d.requests.length > 0 ? (
              <Card>
                <CardTitle title="Novas solicitações" right={<Pressable onPress={() => router.push("/(app)/(tabs)/solicitacoes")}><Text style={{ color: colors.brand, fontWeight: "600" }}>Ver todas</Text></Pressable>} />
                {d.requests.slice(0, 3).map((r) => {
                  const people = (r.adults ?? 0) + (r.children ?? 0) || r.participants;
                  const when = r.desired_date ? new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(`${r.desired_date}T12:00:00-03:00`)) : null;
                  return (
                    <View key={r.id} style={{ gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={styles.h3}>{r.name} <Muted>· {people ? `${people} pessoas` : "sem quantidade"}{when ? ` · ${when}` : ""}</Muted></Text>
                      <Row>
                        <Button title="Responder" size="sm" variant="secondary" onPress={() => Linking.openURL(whatsappUrl(r.whatsapp, `Olá ${r.name.split(" ")[0]}! Aqui é do ${org?.name}. Recebemos seu pedido de orçamento.`))} />
                        <Button title="Criar orçamento" size="sm" onPress={() => router.push({ pathname: "/(app)/novo", params: { request: r.id, name: r.name, whatsapp: r.whatsapp } })} />
                      </Row>
                    </View>
                  );
                })}
              </Card>
            ) : null}

            {/* EVENTO DE HOJE (only when it exists) */}
            {today ? (
              <Pressable onPress={() => openEvent(today)} style={{ borderRadius: 20, padding: 16, gap: 10, backgroundColor: party.ink }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={{ color: party.sun, fontWeight: "800", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Evento de hoje</Text>
                  <Badge tone={EVENT_STATUS_TONE[today.status]}>{EVENT_STATUS_LABEL[today.status]}</Badge>
                </Row>
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }} numberOfLines={1}>{eventTitle(today)}</Text>
                <Text style={{ color: "#cfd2e6", fontSize: 14 }}>{formatTime(today.starts_at)}–{formatTime(today.ends_at)} · {(today.adults ?? 0) + (today.children ?? 0)} pessoas{(d.fin.get(today.id)?.balance ?? 0) > 0 ? ` · falta ${formatCurrency(d.fin.get(today.id)!.balance)}` : ""}</Text>
                <Row style={{ flexWrap: "wrap" }}>
                  <Button title="Abrir portaria" size="sm" onPress={() => openDoor(today)} style={{ backgroundColor: party.sun, borderColor: party.sun }} />
                  <Button title="WhatsApp" size="sm" variant="outline" onPress={() => wa(today, "Tudo certo para a festa de hoje?")} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.3)" }} />
                  <Button title="Abrir evento" size="sm" variant="outline" onPress={() => openEvent(today)} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.3)" }} />
                </Row>
              </Pressable>
            ) : null}

            {/* PRÓXIMOS DIAS (only parties with something pending) */}
            {upcoming.length > 0 ? (
              <Card>
                <CardTitle title="Próximos dias" subtitle="Festas com algo pendente" right={<Pressable onPress={() => router.push("/(app)/(tabs)/agenda")}><Text style={{ color: colors.brand, fontWeight: "600" }}>Agenda</Text></Pressable>} />
                {upcoming.map((e) => (
                  <Pressable key={e.id} onPress={() => openEvent(e)} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, gap: 3 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Text style={styles.h3} numberOfLines={1}>{eventTitle(e)}</Text>
                      <Badge tone={EVENT_STATUS_TONE[e.status]}>{EVENT_STATUS_LABEL[e.status]}</Badge>
                    </Row>
                    <Muted>{formatDateLong(e.starts_at)} · {formatTime(e.starts_at)}{(d.fin.get(e.id)?.balance ?? 0) > 0 ? ` · falta ${formatCurrency(d.fin.get(e.id)!.balance)}` : ""}{e.status === "PRE_RESERVED" ? " · aguardando sinal" : ""}</Muted>
                  </Pressable>
                ))}
              </Card>
            ) : null}

            {quiet ? (
              <View style={{ alignItems: "center", gap: 8, paddingVertical: 36 }}>
                <Ionicons name="balloon-outline" size={40} color={colors.muted} />
                <Text style={styles.h3}>Tudo em dia.</Text>
                <Muted style={{ textAlign: "center" }}>Nada esperando você. Toque em + para montar um orçamento ou mande sua página para um cliente.</Muted>
              </View>
            ) : null}
          </>
        )}
      </Screen>
    </>
  );
}
