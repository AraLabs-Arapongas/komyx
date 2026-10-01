import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, router } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatDateLong, formatPhone, formatTime } from "@/lib/format";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

type Party = { id: string; title: string | null; starts_at: string; ends_at: string; status: EventStatus; expires_at: string | null; adults: number | null; children: number | null; celebrant_name: string | null; customer_name: string; org_name: string; org_slug: string; org_logo: string | null; token: string };

function PartyItem({ p }: { p: Party }) {
return (
  <Link href={{ pathname: "/cliente/reserva/[token]", params: { token: p.token } }} asChild>
    <Pressable>
      <Card>
        <Row>
          {p.org_logo ? <Image alt="" source={{ uri: p.org_logo }} style={{ width: 36, height: 36, borderRadius: 10 }} /> : <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.brand, fontWeight: "800" }}>{p.org_name[0]}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{p.title ?? `Festa de ${p.customer_name}`}</Text>
            <Muted>{p.org_name}</Muted>
          </View>
          <Badge tone={EVENT_STATUS_TONE[p.status]}>{p.status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[p.status]}</Badge>
        </Row>
        <Text style={styles.text}>{formatDateLong(p.starts_at)} · {formatTime(p.starts_at)}–{formatTime(p.ends_at)}</Text>
        {p.status === "PRE_RESERVED" ? <Text style={{ color: colors.amber, fontWeight: "600", fontSize: 13 }}>Pague o sinal para confirmar · toque para ver o Pix</Text> : null}
      </Card>
    </Pressable>
  </Link>
);
}

export default function MinhasFestas() {
  const { session, signOut } = useAuth();
  const q = useQuery({ queryKey: ["my-reservations"], queryFn: async () => { const { data, error } = await supabase.rpc("my_reservations"); if (error) throw error; return (data ?? []) as Party[]; }, enabled: Boolean(session) });
  const parties = q.data ?? [];
  const [now] = useState(() => Date.now());
  const upcoming = parties.filter((p) => new Date(p.ends_at).getTime() >= now);
  const past = parties.filter((p) => new Date(p.ends_at).getTime() < now);


  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Text style={styles.title}>Minhas festas</Text>
      <Muted>{session?.user.phone ? `Celular ${formatPhone(session.user.phone.replace(/^\+?55/, ""))}` : ""}</Muted>
      {q.isLoading ? <Loading /> : parties.length === 0 ? (
        <Empty title="Nenhuma festa neste número" description="Quando um buffet registrar uma reserva com o seu celular, ela aparece aqui. Se já tem uma, confira com o buffet se o número está certo." />
      ) : (
        <>
          {upcoming.map((p) => <PartyItem key={p.id} p={p} />)}
          {past.length ? <Text style={[styles.h3, { marginTop: 8 }]}>Festas passadas</Text> : null}
          {past.map((p) => <PartyItem key={p.id} p={p} />)}
        </>
      )}
      <Button title="Sair" variant="ghost" size="sm" onPress={async () => { await signOut(); router.replace("/entrar"); }} />
    </Screen>
  );
}
