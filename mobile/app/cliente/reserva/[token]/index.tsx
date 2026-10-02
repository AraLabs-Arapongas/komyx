import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router, useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import type { ChangeRequest } from "@/lib/client";
import { formatCurrency, formatDate, formatDateLong, formatDateTime, formatTime, hoursLeft } from "@/lib/format";
import { CONTRACT_STATUS_LABEL, EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from "@/lib/labels";
import { useReservationView } from "@/lib/reservation-view";
import { WEB_URL } from "@/lib/supabase";
import { AskSheet, type AskKind } from "@/ui/client/ask-sheet";
import { Badge, Button, Card, CardTitle, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

const REQUEST_LABEL: Record<ChangeRequest["kind"], string> = { EXTRA: "Pedido de extra", PEOPLE: "Mudança de pessoas", PAYMENT_NOTICE: "Aviso de pagamento", OTHER: "Pedido" };
const REQUEST_TONE: Record<ChangeRequest["status"], "amber" | "green" | "red"> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const REQUEST_STATUS: Record<ChangeRequest["status"], string> = { PENDING: "aguardando o buffet", APPROVED: "confirmado", REJECTED: "não foi possível" };

/** Tile that jumps to another tab with the one number that matters there. */
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

export default function Festa() {
  const { token } = useGlobalSearchParams<{ token: string }>();
  const { session } = useAuth();
  const { q, view, ask } = useReservationView(token);
  const [sheet, setSheet] = useState<AskKind | null>(null);
  if (q.isLoading) return <Loading />;
  if (!view) return <Screen><Empty title="Reserva não encontrada" description="O link pode ter sido desativado. Fale com o buffet." /></Screen>;
  const { r, ev, org, quote, status, showPrices, balance, daysLeft, guestsPeople, pending, pageUrl, capacity } = view;
  const go = (tab: "pagamento" | "convidados" | "convite" | "local") => router.push({ pathname: `/cliente/reserva/[token]/${tab}`, params: { token } });

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
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
        {showPrices && quote ? <Jump icon="qr-code-outline" label="Pagamento" value={balance > 0 ? `Falta ${formatCurrency(balance)}` : "Tudo pago"} tone={balance > 0 ? "warn" : "ok"} onPress={() => go("pagamento")} /> : null}
        <Jump icon="people-outline" label="Convidados confirmados" value={`${guestsPeople} de ${capacity.contractedA + capacity.contractedC}`} tone={capacity.overA + capacity.overC > 0 ? "warn" : undefined} onPress={() => go("convidados")} />
        <Jump icon="mail-open-outline" label="Convite" value={ev.invite_title || ev.invite_image_url ? "Personalizado" : "Personalizar"} tone={ev.invite_title || ev.invite_image_url ? "ok" : undefined} onPress={() => go("convite")} />
        <Jump icon="navigate-outline" label="Como chegar" value={org.name} onPress={() => go("local")} />
      </View>

      {quote ? (
        <Card>
          <CardTitle title="O que está incluído" right={r.quote_token ? <Pressable onPress={() => Linking.openURL(`${WEB_URL}/q/${r.quote_token}/pdf`)}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>PDF</Text></Pressable> : undefined} />
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
          <Button title={r.contract.status === "ACCEPTED" ? "Ver contrato" : "Ler e aceitar o contrato"} variant={r.contract.status === "ACCEPTED" ? "outline" : "primary"} onPress={() => Linking.openURL(`${WEB_URL}/c/${r.contract!.token}`)} />
        </Card>
      ) : null}

      <Card>
        <CardTitle title="Esta página" subtitle="Guarde o link para achar sua festa de novo" />
        <Text selectable style={{ color: colors.muted, fontSize: 13 }}>{pageUrl}</Text>
        <Row>
          <Button title="Copiar link" size="sm" variant="outline" onPress={async () => { await Clipboard.setStringAsync(pageUrl); Alert.alert("Copiado"); }} />
          <Button title="Enviar pra mim" size="sm" variant="outline" onPress={() => Share.share({ message: pageUrl })} />
        </Row>
      </Card>
      {org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="secondary" onPress={() => view.wa(`Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}.`)} /> : null}
      <Button title={session ? "Minhas festas" : "Entrar com meu celular para ver todas as minhas festas"} variant="ghost" size="sm" onPress={() => router.replace(session ? "/cliente" : "/entrar")} />

      <AskSheet view={view} ask={ask} sheet={sheet} onChange={setSheet} />
    </Screen>
  );
}
