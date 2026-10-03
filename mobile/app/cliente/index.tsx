import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import type { ChangeRequest } from "@/lib/client";
import { formatCurrency, formatDate, formatDateLong, formatDateTime, formatTime, hoursLeft } from "@/lib/format";
import { CONTRACT_STATUS_LABEL, EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from "@/lib/labels";
import { useParty } from "@/lib/party-context";
import { useReservationView } from "@/lib/reservation-view";
import { WEB_URL, supabase } from "@/lib/supabase";
import { openWeb } from "@/lib/web";
import { KomyxMark } from "@/ui/brand";
import { AskSheet, type AskKind } from "@/ui/client/ask-sheet";
import { Badge, Button, Card, CardTitle, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { Sprinkles } from "@/ui/festive-header";
import { colors } from "@/ui/theme";

import type { Party } from "@/ui/client/party-card";
const REQUEST_LABEL: Record<ChangeRequest["kind"], string> = { EXTRA: "Pedido de extra", PEOPLE: "Mudança de pessoas", PAYMENT_NOTICE: "Aviso de pagamento", OTHER: "Pedido" };
const REQUEST_TONE: Record<ChangeRequest["status"], "amber" | "green" | "red"> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const REQUEST_STATUS: Record<ChangeRequest["status"], string> = { PENDING: "aguardando o buffet", APPROVED: "confirmado", REJECTED: "não foi possível" };

/** Tile that jumps to a tab with the one number that matters there. */
function Jump({ icon, label, value, tone, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone?: "warn" | "ok"; onPress: () => void }) {
  const bg = tone === "warn" ? colors.sunSoft : tone === "ok" ? colors.mintSoft : colors.surface;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: "45%", padding: 12, borderRadius: 16, backgroundColor: bg, borderWidth: 1, borderColor: colors.border, gap: 4, opacity: pressed ? 0.8 : 1 })}>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text style={{ fontWeight: "800", color: colors.ink }} numberOfLines={1}>{value}</Text>
      <Muted style={{ fontSize: 12 }}>{label}</Muted>
    </Pressable>
  );
}

/** The chosen party: status, jump tiles into the tabs, what is included, requests, contract, link. */
function Overview({ token }: { token: string }) {
  const { q, view, ask } = useReservationView(token);
  const [sheet, setSheet] = useState<AskKind | null>(null);
  if (q.isLoading) return <Loading />;
  if (!view) return <Card><Text style={styles.cardTitle}>Reserva não encontrada</Text><Muted>O link pode ter sido desativado. Fale com o buffet.</Muted></Card>;
  const { r, ev, org, quote, status, showPrices, balance, daysLeft, guestsPeople, pending, pageUrl, capacity, locked } = view;
  if (locked) {
    return (
      <>
        <Card tone="amber">
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={[styles.title, { flex: 1 }]} numberOfLines={2}>{view.title}</Text>
            <Badge tone={EVENT_STATUS_TONE[status]}>{status === "EXPIRED" ? "Reserva vencida" : EVENT_STATUS_LABEL[status]}</Badge>
          </Row>
          <Text style={styles.text}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</Text>
          <Text style={{ color: colors.amber, fontWeight: "600" }}>{status === "EXPIRED" ? "O prazo do sinal passou e a data foi liberada. Pagamento, convidados e convite ficam fechados até o buffet reservar de novo." : "Esta festa foi cancelada. Pagamento, convidados e convite ficam fechados."}</Text>
        </Card>
        <Card>
          <CardTitle title={`Falar com ${org.name}`} subtitle={status === "EXPIRED" ? "Se ainda quiser a data, o buffet verifica se está livre e refaz a reserva." : "Qualquer dúvida sobre valores já pagos ou outra data."} />
          {org.whatsapp ? <Button title="Chamar no WhatsApp" icon={<Ionicons name="logo-whatsapp" size={18} color="#fff" />} onPress={() => view.wa(status === "EXPIRED" ? `Olá! Minha reserva de ${formatDateLong(ev.starts_at)} venceu. Ainda dá para fazer a festa nessa data?` : `Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}.`)} /> : <Muted>O buffet não informou WhatsApp. Procure pelo telefone ou pela página pública.</Muted>}
          <Button title="Ver a página do buffet" variant="outline" onPress={() => openWeb(`${WEB_URL}/p/${org.slug}`, org.name)} />
        </Card>
      </>
    );
  }
  return (
    <>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={[styles.title, { flex: 1 }]} numberOfLines={2}>{view.title}</Text>
          <Badge tone={EVENT_STATUS_TONE[status]}>{status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[status]}</Badge>
        </Row>
        <Text style={styles.text}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}{daysLeft > 0 && status === "CONFIRMED" ? `  ·  faltam ${daysLeft} dia${daysLeft === 1 ? "" : "s"}` : ""}</Text>
        <Muted>{ev.adults ?? 0} adultos · {ev.children ?? 0} crianças{ev.celebrant_name ? ` · ${ev.celebrant_name}${ev.celebrant_age ? `, ${ev.celebrant_age} anos` : ""}` : ""}{ev.theme ? ` · tema ${ev.theme}` : ""}</Muted>
        {status === "PRE_RESERVED" && ev.expires_at ? <Text style={{ color: colors.amber, fontWeight: "600" }}>Data segura até {formatDateTime(ev.expires_at)} ({hoursLeft(ev.expires_at)}h). Pague o sinal até lá para confirmar.</Text> : null}
        {status === "CONFIRMED" ? <Text style={{ color: colors.green, fontWeight: "600" }}>Festa confirmada.{balance > 0 && showPrices ? ` Falta pagar ${formatCurrency(balance)}.` : " Tudo pago."}</Text> : null}
        {status === "EXPIRED" ? <Text style={{ color: colors.red, fontWeight: "600" }}>O prazo do sinal passou e a data foi liberada. Fale com o buffet para reservar de novo.</Text> : null}
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {showPrices && quote ? <Jump icon="qr-code-outline" label="Pagamento" value={balance > 0 ? `Falta ${formatCurrency(balance)}` : "Tudo pago"} tone={balance > 0 ? "warn" : "ok"} onPress={() => router.push("/cliente/pagamento")} /> : null}
        <Jump icon="people-outline" label="Convidados confirmados" value={`${guestsPeople} de ${capacity.contractedA + capacity.contractedC}`} tone={capacity.overA + capacity.overC > 0 ? "warn" : undefined} onPress={() => router.push("/cliente/convidados")} />
        <Jump icon="mail-open-outline" label="Convite" value={ev.invite_title || ev.invite_image_url ? "Personalizado" : "Personalizar"} tone={ev.invite_title || ev.invite_image_url ? "ok" : undefined} onPress={() => router.push("/cliente/convite")} />
        <Jump icon="navigate-outline" label="Como chegar" value={org.name} onPress={() => router.push("/cliente/local")} />
      </View>

      {quote ? (
        <Card>
          <CardTitle title="O que está incluído" right={r.quote_token ? <Pressable onPress={() => openWeb(`${WEB_URL}/q/${r.quote_token}/pdf`, "Orçamento")}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>PDF</Text></Pressable> : undefined} />
          {quote.items.map((it, i) => (
            <Row key={i} style={{ justifyContent: "space-between" }}>
              <Text style={[styles.text, { flex: 1 }]}>{it.description}{Number(it.quantity) !== 1 && !/\(\d+\)/.test(it.description) ? ` × ${Number(it.quantity)}` : ""}</Text>
              {showPrices ? <Text style={{ fontWeight: "600" }}>{formatCurrency(it.total)}</Text> : null}
            </Row>
          ))}
          {r.extras.map((x) => (
            <Row key={x.id} style={{ justifyContent: "space-between" }}>
              <Text style={[styles.text, { flex: 1 }]}>{x.description}{x.quantity !== 1 ? ` × ${x.quantity}` : ""} <Muted>· extra</Muted></Text>
              {showPrices ? <Text style={{ fontWeight: "600" }}>{formatCurrency(x.total ?? x.quantity * x.unit_price)}</Text> : null}
            </Row>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardTitle title="Pedidos ao buffet" subtitle="Extras, mais gente, outra coisa: você pede, o buffet confirma." right={pending.length ? <Badge tone="amber">{pending.length} aguardando</Badge> : undefined} />
        {r.requests.slice(0, 5).map((x) => (
          <Row key={x.id} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}><Text style={styles.text}>{REQUEST_LABEL[x.kind]}{x.payload && typeof x.payload.description === "string" ? ` · ${x.payload.description}` : ""}</Text>{x.message && x.kind !== "PAYMENT_NOTICE" ? <Muted>{x.message}</Muted> : null}<Muted>{formatDate(x.created_at)}</Muted></View>
            <Badge tone={REQUEST_TONE[x.status]}>{REQUEST_STATUS[x.status]}</Badge>
          </Row>
        ))}
        <Button title="Pedir algo ao buffet" variant="secondary" onPress={() => setSheet("menu")} />
      </Card>

      {r.contract ? (
        <Card>
          <CardTitle title={`Contrato nº ${r.contract.number}`} subtitle={CONTRACT_STATUS_LABEL[r.contract.status] ?? r.contract.status} />
          <Button title={r.contract.status === "ACCEPTED" ? "Ver contrato" : "Ler e aceitar o contrato"} variant={r.contract.status === "ACCEPTED" ? "outline" : "primary"} onPress={() => openWeb(r.contract!.status === "ACCEPTED" ? `${WEB_URL}/c/${r.contract!.token}/pdf` : `${WEB_URL}/c/${r.contract!.token}`, `Contrato nº ${r.contract!.number}`)} />
        </Card>
      ) : null}

      <Card>
        <CardTitle title="Link desta festa" subtitle="Guarde para abrir de novo ou em outro aparelho" />
        <Pressable onPress={() => openWeb(pageUrl, view.title)}><Text style={{ color: colors.brand, fontSize: 13, textDecorationLine: "underline" }}>{pageUrl}</Text></Pressable>
        <Row>
          <Button title="Copiar link" size="sm" variant="outline" onPress={async () => { await Clipboard.setStringAsync(pageUrl); Alert.alert("Copiado"); }} />
          <Button title="Enviar pra mim" size="sm" variant="outline" onPress={() => Share.share({ message: pageUrl })} />
        </Row>
      </Card>
      {org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="secondary" onPress={() => view.wa(`Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}.`)} /> : null}
      <AskSheet view={view} ask={ask} sheet={sheet} onChange={setSheet} />
    </>
  );
}

export default function Inicio() {
  const { session, signOut } = useAuth();
  const { token, ready, setToken } = useParty();
  const q = useQuery({ queryKey: ["my-reservations"], queryFn: async () => { const { data, error } = await supabase.rpc("my_reservations"); if (error) throw error; return (data ?? []) as Party[]; }, enabled: Boolean(session) });
  const parties = q.data ?? [];

  // One party only: nothing to choose. Several and none chosen yet: the full-screen chooser.
  const only = parties.length === 1 ? parties[0].token : null;
  useEffect(() => {
    if (ready && !token && only) setToken(only);
  }, [ready, token, only, setToken]);

  if (!ready || (session && q.isLoading && !token)) return <Screen><Loading /></Screen>;
  if (!token && parties.length > 1) return <Redirect href="/escolher-festa" />;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()} resetScrollKey={token}>
      <Sprinkles />
      {!token ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 12 }}>
          <KomyxMark size={72} color={colors.brand} />
          <Text style={[styles.title, { textAlign: "center" }]}>Nenhuma festa neste número</Text>
          <Muted style={{ textAlign: "center" }}>Quando um buffet registrar uma reserva com o seu celular, ela aparece aqui. Se já tem uma, confira com o buffet se o número está certo, ou abra pelo link que você recebeu.</Muted>
          <Button title="Tenho um link da reserva" variant="secondary" onPress={() => router.replace("/entrar")} />
        </View>
      ) : (
        <>
          {parties.length > 1 ? (
            <Pressable onPress={() => router.push("/escolher-festa")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: pressed ? colors.elevated : colors.surface, borderWidth: 1, borderColor: colors.border })}>
              <Ionicons name="swap-horizontal" size={18} color={colors.brand} />
              <Text style={[styles.text, { flex: 1, fontWeight: "700" }]}>Trocar de festa</Text>
              <Muted>{parties.length} festas</Muted>
              <Ionicons name="chevron-forward" size={16} color={colors.dim} />
            </Pressable>
          ) : null}
          <Overview token={token} />
        </>
      )}
      {session ? <Button title="Sair" variant="ghost" size="sm" style={{ marginTop: 12 }} onPress={async () => { setToken(null); await signOut(); router.replace("/entrar"); }} /> : <Button title="Entrar com meu celular para ver todas as minhas festas" variant="ghost" size="sm" style={{ marginTop: 12 }} onPress={() => router.replace("/entrar")} />}
    </Screen>
  );
}
