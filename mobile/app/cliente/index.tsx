import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { loadReservation } from "@/lib/client";
import { allocateInstallments } from "@/lib/installments";
import { formatCurrency } from "@/lib/format";
import { formatDateLong, formatPhone, formatTime } from "@/lib/format";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Loading, Muted, Screen, styles } from "@/ui/components";
import { FestiveHeader, Sprinkles } from "@/ui/festive-header";
import { KomyxMark } from "@/ui/brand";
import { party } from "@/ui/party";
import { colors, shadow } from "@/ui/theme";

type Party = { id: string; title: string | null; starts_at: string; ends_at: string; status: EventStatus; expires_at: string | null; adults: number | null; children: number | null; celebrant_name: string | null; customer_name: string; org_name: string; org_logo: string | null; token: string };

const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

function Shortcut({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: 16, backgroundColor: pressed ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.12)" })}>
      <Ionicons name={icon} size={22} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

/** The next party gets the stage: ink card, countdown, status and shortcuts into the party panel. */
function HeroParty({ p }: { p: Party }) {
  const days = daysUntil(p.starts_at);
  const open = () => router.push({ pathname: "/cliente/reserva/[token]", params: { token: p.token } });
  return (
    <Pressable onPress={open} style={{ borderRadius: 24, overflow: "hidden", backgroundColor: party.ink, padding: 18, gap: 12, ...shadow }}>
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
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.4 }} numberOfLines={2}>{p.title ?? `Festa de ${p.customer_name}`}</Text>
          <Text style={{ color: "#cfd2e6", fontSize: 13, fontWeight: "600" }}>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)}–{formatTime(p.ends_at)}</Text>
          <Text style={{ color: "#cfd2e6", fontSize: 13 }}>{p.org_name}{p.adults != null ? ` · ${(p.adults ?? 0) + (p.children ?? 0)} pessoas` : ""}</Text>
        </View>
      </View>
      {p.status === "PRE_RESERVED" ? <Text style={{ color: party.sun, fontWeight: "800" }}>Pague o sinal para confirmar a data · toque para ver o Pix</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Shortcut icon="qr-code-outline" label="Pagamento" onPress={open} />
        <Shortcut icon="people-outline" label="Convidados" onPress={open} />
        <Shortcut icon="mail-open-outline" label="Convite" onPress={open} />
        <Shortcut icon="navigate-outline" label="Local" onPress={open} />
      </View>
    </Pressable>
  );
}

function PartyItem({ p }: { p: Party }) {
  const days = daysUntil(p.starts_at);
  return (
    <Pressable onPress={() => router.push({ pathname: "/cliente/reserva/[token]", params: { token: p.token } })} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: pressed ? colors.elevated : colors.surface, borderWidth: 1, borderColor: colors.border, ...shadow })}>
      {p.org_logo ? <Image alt="" source={{ uri: p.org_logo }} style={{ width: 44, height: 44, borderRadius: 14 }} /> : <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><KomyxMark size={26} color={colors.brand} /></View>}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{p.title ?? `Festa de ${p.customer_name}`}</Text>
        <Muted>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)} · {p.org_name}</Muted>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Badge tone={EVENT_STATUS_TONE[p.status]}>{p.status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[p.status]}</Badge>
        {days > 0 ? <Muted style={{ fontSize: 11 }}>em {days} d</Muted> : null}
      </View>
    </Pressable>
  );
}

/** What is still open for the next party: deposit, balance, contract, guests. Each row opens the panel. */
function Checklist({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["reservation", token], queryFn: () => loadReservation(token) });
  const r = q.data;
  if (!r) return null;
  const quote = r.quote;
  const installments = quote ? allocateInstallments(quote.installments, r.paid, r.event.starts_at, quote.decided_at) : [];
  const extras = r.extras.reduce((a, x) => a + Number(x.total ?? x.quantity * x.unit_price), 0);
  const balance = Math.max(0, (quote?.total ?? 0) + extras - r.paid);
  const depositPaid = installments[0] ? installments[0].status === "PAID" : r.paid > 0;
  const guestsPeople = r.guests.reduce((a, g) => a + g.adults + g.children, 0);
  const contracted = (r.event.adults ?? 0) + (r.event.children ?? 0);
  const items: { ok: boolean; label: string; hint: string }[] = [
    { ok: depositPaid, label: depositPaid ? "Sinal pago" : "Pagar o sinal", hint: depositPaid ? "Data garantida" : "Garante a data da festa" },
    ...(quote && r.org.show_prices_public ? [{ ok: balance <= 0, label: balance <= 0 ? "Tudo pago" : `Falta pagar ${formatCurrency(balance)}`, hint: balance <= 0 ? "Nenhum valor em aberto" : "Pix na tela da festa" }] : []),
    ...(r.contract ? [{ ok: r.contract.status === "ACCEPTED", label: r.contract.status === "ACCEPTED" ? "Contrato aceito" : "Ler e aceitar o contrato", hint: `Contrato nº ${r.contract.number}` }] : []),
    { ok: guestsPeople >= Math.round(contracted * 0.8) && guestsPeople > 0, label: `${guestsPeople} de ${contracted} convidados confirmados`, hint: r.guests.length ? `${r.guests.length} ${r.guests.length === 1 ? "confirmação" : "confirmações"} pelo link` : "Envie o link de confirmação" },
    ...(r.invite_token ? [{ ok: Boolean(r.event.invite_title || r.event.invite_image_url), label: r.event.invite_title || r.event.invite_image_url ? "Convite personalizado" : "Personalizar o convite", hint: "Título, mensagem e foto" }] : []),
  ];
  const done = items.filter((i) => i.ok).length;
  return (
    <Pressable onPress={() => router.push({ pathname: "/cliente/reserva/[token]", params: { token } })} style={{ borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10, ...shadow }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.cardTitle}>Checklist da festa</Text>
        <Badge tone={done === items.length ? "green" : "amber"}>{done}/{items.length}</Badge>
      </View>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: it.ok ? colors.mintSoft : colors.sunSoft, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={it.ok ? "checkmark" : "ellipse-outline"} size={16} color={it.ok ? colors.green : colors.amber} />
          </View>
          <View style={{ flex: 1 }}><Text style={[styles.text, it.ok && { color: colors.muted }]}>{it.label}</Text><Muted style={{ fontSize: 12 }}>{it.hint}</Muted></View>
          <Ionicons name="chevron-forward" size={16} color={colors.dim} />
        </View>
      ))}
    </Pressable>
  );
}

export default function MinhasFestas() {
  const { session, signOut } = useAuth();
  const q = useQuery({ queryKey: ["my-reservations"], queryFn: async () => { const { data, error } = await supabase.rpc("my_reservations"); if (error) throw error; return (data ?? []) as Party[]; }, enabled: Boolean(session) });
  const parties = q.data ?? [];
  const [now] = useState(() => Date.now());
  const upcoming = parties.filter((p) => new Date(p.ends_at).getTime() >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = parties.filter((p) => new Date(p.ends_at).getTime() < now);
  const [hero, ...rest] = upcoming;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Sprinkles />
      <FestiveHeader animated eyebrow="Komyx" title="Minhas festas" subtitle={session?.user.phone ? `Celular ${formatPhone(session.user.phone.replace(/^\+?55/, ""))}` : undefined} />
      {q.isLoading ? <Loading /> : parties.length === 0 ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 28, paddingHorizontal: 12 }}>
          <KomyxMark size={72} color={colors.brand} />
          <Text style={[styles.title, { textAlign: "center" }]}>Nenhuma festa neste número</Text>
          <Muted style={{ textAlign: "center" }}>Quando um buffet registrar uma reserva com o seu celular, ela aparece aqui. Se já tem uma, confira com o buffet se o número está certo, ou abra pelo link que você recebeu.</Muted>
          <Button title="Tenho um link da reserva" variant="secondary" onPress={() => router.replace("/entrar")} />
        </View>
      ) : (
        <>
          {hero ? <HeroParty p={hero} /> : null}
          {hero ? <Checklist token={hero.token} /> : null}
          {rest.length ? <Text style={[styles.h3, { marginTop: 6 }]}>Mais festas</Text> : null}
          {rest.map((p) => <PartyItem key={p.id} p={p} />)}
          {past.length ? <Text style={[styles.h3, { marginTop: 10 }]}>Festas passadas</Text> : null}
          {past.map((p) => <PartyItem key={p.id} p={p} />)}
          <View style={{ padding: 14, borderRadius: 20, backgroundColor: colors.elevated, gap: 4, marginTop: 6 }}>
            <Text style={styles.h3}>Recebeu um link de outra festa?</Text>
            <Muted>Cole o link na tela de entrar e ela aparece aqui também, desde que seja o mesmo celular da reserva.</Muted>
          </View>
        </>
      )}
      <Button title="Sair" variant="ghost" size="sm" onPress={async () => { await signOut(); router.replace("/entrar"); }} />
    </Screen>
  );
}
