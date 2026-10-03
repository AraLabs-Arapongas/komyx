import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import type { ChangeRequest } from "@/lib/client";
import { formatCurrency, formatDate, formatDateLong, formatDateTime, formatTime, hoursLeft } from "@/lib/format";
import { CONTRACT_STATUS_LABEL, EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { useParty } from "@/lib/party-context";
import { useReservationView } from "@/lib/reservation-view";
import { WEB_URL, supabase } from "@/lib/supabase";
import { KomyxMark } from "@/ui/brand";
import { AskSheet, type AskKind } from "@/ui/client/ask-sheet";
import { Badge, Button, Card, CardTitle, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { Sprinkles } from "@/ui/festive-header";
import { party } from "@/ui/party";
import { colors, shadow } from "@/ui/theme";

type Party = { id: string; title: string | null; starts_at: string; ends_at: string; status: EventStatus; expires_at: string | null; adults: number | null; children: number | null; celebrant_name: string | null; customer_name: string; org_name: string; org_logo: string | null; token: string };

const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
const REQUEST_LABEL: Record<ChangeRequest["kind"], string> = { EXTRA: "Pedido de extra", PEOPLE: "Mudança de pessoas", PAYMENT_NOTICE: "Aviso de pagamento", OTHER: "Pedido" };
const REQUEST_TONE: Record<ChangeRequest["status"], "amber" | "green" | "red"> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const REQUEST_STATUS: Record<ChangeRequest["status"], string> = { PENDING: "aguardando o buffet", APPROVED: "confirmado", REJECTED: "não foi possível" };

/** One party to pick. `hero` is the big ink version with the countdown. */
function PartyCard({ p, hero, onPress }: { p: Party; hero?: boolean; onPress: () => void }) {
  const days = daysUntil(p.starts_at);
  const name = p.title ?? `Festa de ${p.customer_name}`;
  if (hero) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ borderRadius: 24, overflow: "hidden", backgroundColor: party.ink, padding: 18, gap: 14, opacity: pressed ? 0.9 : 1, ...shadow })}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: party.sun, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>Próxima festa</Text>
          <Badge tone={EVENT_STATUS_TONE[p.status]}>{p.status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[p.status]}</Badge>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: party.berry, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 30 }}>{days > 0 ? days : days === 0 ? "Hoje" : "✓"}</Text>
            {days > 0 ? <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>{days === 1 ? "dia" : "dias"}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.4 }} numberOfLines={2}>{name}</Text>
            <Text style={{ color: "#cfd2e6", fontSize: 13, fontWeight: "600" }}>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)}–{formatTime(p.ends_at)}</Text>
            <Text style={{ color: "#cfd2e6", fontSize: 13 }}>{p.org_name}{p.adults != null ? ` · ${(p.adults ?? 0) + (p.children ?? 0)} pessoas` : ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: pressed ? colors.elevated : colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow })}>
      {p.org_logo ? <Image alt="" source={{ uri: p.org_logo }} style={{ width: 44, height: 44, borderRadius: 14 }} /> : <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><KomyxMark size={26} color={colors.brand} /></View>}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
        <Muted>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)} · {p.org_name}</Muted>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Badge tone={EVENT_STATUS_TONE[p.status]}>{p.status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[p.status]}</Badge>
        {days > 0 ? <Muted style={{ fontSize: 11 }}>em {days} d</Muted> : null}
      </View>
    </Pressable>
  );
}

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
  const { r, ev, org, quote, status, showPrices, balance, daysLeft, guestsPeople, pending, pageUrl, capacity } = view;
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
        <CardTitle title="Link desta festa" subtitle="Guarde para abrir de novo ou em outro aparelho" />
        <Text selectable style={{ color: colors.muted, fontSize: 13 }}>{pageUrl}</Text>
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
  const [now] = useState(() => Date.now());
  const upcoming = parties.filter((p) => new Date(p.ends_at).getTime() >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = parties.filter((p) => new Date(p.ends_at).getTime() < now);
  const [picking, setPicking] = useState(false);

  // First time in: the next party is the one in context. A party opened by link keeps precedence.
  useEffect(() => {
    if (!ready || token || !parties.length) return;
    setToken((upcoming[0] ?? parties[0]).token);
  }, [ready, token, parties, upcoming, setToken]);

  const current = parties.find((p) => p.token === token);
  const others = parties.filter((p) => p.token !== token);
  const pick = (p: Party) => { setToken(p.token); setPicking(false); };
  const showList = picking || (!token && !q.isLoading);

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Sprinkles />
      {!ready || (session && q.isLoading && !token) ? <Loading /> : showList ? (
        parties.length === 0 && !token ? (
          <View style={{ alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 12 }}>
            <KomyxMark size={72} color={colors.brand} />
            <Text style={[styles.title, { textAlign: "center" }]}>Nenhuma festa neste número</Text>
            <Muted style={{ textAlign: "center" }}>Quando um buffet registrar uma reserva com o seu celular, ela aparece aqui. Se já tem uma, confira com o buffet se o número está certo, ou abra pelo link que você recebeu.</Muted>
            <Button title="Tenho um link da reserva" variant="secondary" onPress={() => router.replace("/entrar")} />
          </View>
        ) : (
          <>
            {upcoming[0] ? <PartyCard p={upcoming[0]} hero onPress={() => pick(upcoming[0])} /> : null}
            {upcoming.slice(1).length ? <Text style={[styles.h3, { marginTop: 6 }]}>Mais festas</Text> : null}
            {upcoming.slice(1).map((p) => <PartyCard key={p.id} p={p} onPress={() => pick(p)} />)}
            {past.length ? <Text style={[styles.h3, { marginTop: 10 }]}>Festas passadas</Text> : null}
            {past.map((p) => <PartyCard key={p.id} p={p} onPress={() => pick(p)} />)}
            {picking ? <Button title="Cancelar" variant="ghost" size="sm" onPress={() => setPicking(false)} /> : null}
          </>
        )
      ) : token ? (
        <>
          {(others.length > 0 || !current) && parties.length > 0 ? (
            <Pressable onPress={() => setPicking(true)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 16, backgroundColor: pressed ? colors.elevated : colors.surface, borderWidth: 1, borderColor: colors.border })}>
              <Ionicons name="swap-horizontal" size={18} color={colors.brand} />
              <Text style={[styles.text, { flex: 1, fontWeight: "700" }]}>Trocar de festa</Text>
              <Muted>{parties.length} {parties.length === 1 ? "festa" : "festas"}</Muted>
              <Ionicons name="chevron-forward" size={16} color={colors.dim} />
            </Pressable>
          ) : null}
          <Overview token={token} />
        </>
      ) : null}
      {session ? <Button title="Sair" variant="ghost" size="sm" style={{ marginTop: 12 }} onPress={async () => { setToken(null); await signOut(); router.replace("/entrar"); }} /> : <Button title="Entrar com meu celular para ver todas as minhas festas" variant="ghost" size="sm" style={{ marginTop: 12 }} onPress={() => router.replace("/entrar")} />}
    </Screen>
  );
}
