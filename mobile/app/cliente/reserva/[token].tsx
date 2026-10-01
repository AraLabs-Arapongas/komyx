import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/lib/auth";
import { loadReservation } from "@/lib/client";
import { formatCurrency, formatDateLong, formatDateTime, formatTime, hoursLeft, whatsappUrl } from "@/lib/format";
import { allocateInstallments, dueShort } from "@/lib/installments";
import { CONTRACT_STATUS_LABEL, EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { buildPixPayload } from "@/lib/pix";
import { WEB_URL } from "@/lib/supabase";
import { Badge, Button, Card, CardTitle, Divider, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Reserva() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useAuth();
  const q = useQuery({ queryKey: ["reservation", token], queryFn: () => loadReservation(token) });
  const [showPayload, setShowPayload] = useState(false);
  if (q.isLoading) return <Loading />;
  const r = q.data;
  if (!r) return <Screen><Empty title="Reserva não encontrada" description="O link pode ter sido desativado. Fale com o buffet." /></Screen>;
  const { event: ev, org, quote } = r;
  const status = ev.status as EventStatus;
  const installments = quote ? allocateInstallments(quote.installments, r.paid, ev.starts_at, quote.decided_at) : [];
  const deposit = installments[0]?.amountNum ?? null;
  const needsDeposit = status === "PRE_RESERVED" && r.paid <= 0;
  const pix = org.pix_key && ev.pix_txid && needsDeposit ? buildPixPayload({ key: org.pix_key, merchantName: org.legal_name || org.name, merchantCity: (org.city || "SAO PAULO").split("/")[0], amount: deposit, txid: ev.pix_txid, description: `${ev.pix_txid} sinal festa` }) : null;
  const pageUrl = `${WEB_URL}/r/${token}`;
  const showPrices = org.show_prices_public;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Row>
        {org.logo_url ? <Image alt="" source={{ uri: org.logo_url }} style={{ width: 40, height: 40, borderRadius: 10 }} /> : null}
        <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{org.name}</Text><Muted>{org.address ?? org.city ?? ""}</Muted></View>
      </Row>
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={styles.title}>{ev.title ?? `Festa de ${ev.customer.name}`}</Text>
          <Badge tone={EVENT_STATUS_TONE[status]}>{status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[status]}</Badge>
        </Row>
        <Text style={styles.text}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</Text>
        <Muted>{ev.adults ?? 0} adultos · {ev.children ?? 0} crianças{ev.celebrant_name ? ` · ${ev.celebrant_name}` : ""}</Muted>
        {status === "PRE_RESERVED" && ev.expires_at ? <Text style={{ color: colors.amber, fontWeight: "600" }}>Data segura até {formatDateTime(ev.expires_at)} ({hoursLeft(ev.expires_at)}h). Pague o sinal até lá para confirmar.</Text> : null}
        {status === "CONFIRMED" ? <Text style={{ color: colors.green, fontWeight: "600" }}>Festa confirmada. Até lá!</Text> : null}
        {status === "EXPIRED" ? <Text style={{ color: colors.red, fontWeight: "600" }}>O prazo do sinal passou e a data foi liberada. Fale com o buffet para reservar de novo.</Text> : null}
      </Card>

      {pix ? (
        <Card tone="brand">
          <CardTitle title="Pague o sinal por Pix" subtitle={deposit ? `${formatCurrency(deposit)} · identificador ${ev.pix_txid}` : `identificador ${ev.pix_txid}`} />
          <View style={{ alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16 }}><QRCode value={pix} size={200} /></View>
          <Button title="Copiar código Pix (copia e cola)" onPress={async () => { await Clipboard.setStringAsync(pix); Alert.alert("Copiado", "Abra o app do seu banco e cole em Pix copia e cola."); }} />
          <Row style={{ justifyContent: "space-between" }}>
            <Muted>Chave: {org.pix_key}</Muted>
            <Pressable onPress={async () => { await Clipboard.setStringAsync(org.pix_key!); Alert.alert("Chave copiada"); }}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>Copiar chave</Text></Pressable>
          </Row>
          <Muted>O buffet confirma a festa assim que vir o Pix com o identificador {ev.pix_txid} no extrato.</Muted>
          <Pressable onPress={() => setShowPayload((v) => !v)}><Text style={{ color: colors.muted, fontSize: 12 }}>{showPayload ? "ocultar código" : "ver código completo"}</Text></Pressable>
          {showPayload ? <Text selectable style={{ fontFamily: "Courier", fontSize: 11, color: colors.muted }}>{pix}</Text> : null}
        </Card>
      ) : null}

      {quote ? (
        <Card>
          <CardTitle title="Orçamento" right={r.quote_token ? <Pressable onPress={() => Linking.openURL(`${WEB_URL}/q/${r.quote_token}/pdf`)}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>PDF</Text></Pressable> : null} />
          {quote.items.map((it, i) => (
            <Row key={i} style={{ justifyContent: "space-between" }}>
              <Text style={[styles.text, { flex: 1 }]}>{it.description}{Number(it.quantity) !== 1 ? ` × ${Number(it.quantity)}` : ""}</Text>
              {showPrices ? <Text style={{ fontWeight: "600" }}>{formatCurrency(it.total)}</Text> : null}
            </Row>
          ))}
          {showPrices ? <><Divider /><Row style={{ justifyContent: "space-between" }}><Text style={styles.cardTitle}>Total</Text><Text style={styles.cardTitle}>{formatCurrency(quote.total)}</Text></Row></> : null}
          {installments.length ? <Text style={[styles.h3, { marginTop: 6 }]}>Parcelas</Text> : null}
          {installments.map((i, idx) => (
            <Row key={idx} style={{ justifyContent: "space-between" }}>
              <Text style={[styles.text, { flex: 1 }]}>{i.status === "PAID" ? "✓ " : ""}{idx + 1}. {i.label} <Muted>· {dueShort(i.due)}</Muted></Text>
              {showPrices ? <Text style={{ fontWeight: "600", color: i.status === "PAID" ? colors.green : i.status === "PARTIAL" ? colors.amber : colors.foreground }}>{i.status === "PARTIAL" ? `falta ${formatCurrency(i.remaining)}` : formatCurrency(i.amountNum)}</Text> : <Text style={{ color: i.status === "PAID" ? colors.green : colors.muted, fontSize: 13 }}>{i.status === "PAID" ? "paga" : "em aberto"}</Text>}
            </Row>
          ))}
          {r.paid > 0 && showPrices ? <Text style={{ color: colors.green }}>Pago até agora: {formatCurrency(r.paid)}</Text> : null}
        </Card>
      ) : null}

      {r.contract ? (
        <Card>
          <CardTitle title={`Contrato nº ${r.contract.number}`} subtitle={CONTRACT_STATUS_LABEL[r.contract.status] ?? r.contract.status} />
          <Button title={r.contract.status === "ACCEPTED" ? "Ver contrato" : "Ler e aceitar o contrato"} variant={r.contract.status === "ACCEPTED" ? "outline" : "primary"} onPress={() => Linking.openURL(`${WEB_URL}/c/${r.contract!.token}`)} />
        </Card>
      ) : null}

      {r.guest_token ? (
        <Card>
          <CardTitle title="Convidados" subtitle={`${r.guests.length} confirmações · ${r.guests.reduce((a, g) => a + g.adults + g.children, 0)} pessoas`} />
          <Button title="Compartilhar link de confirmação" variant="outline" onPress={() => Share.share({ message: `Confirme presença na ${ev.title ?? "festa"}: ${WEB_URL}/g/${r.guest_token}` })} />
        </Card>
      ) : null}

      <Card>
        <CardTitle title="Esta página" subtitle="Guarde o link para achar sua reserva de novo" />
        <Text selectable style={{ color: colors.muted, fontSize: 13 }}>{pageUrl}</Text>
        <Row>
          <Button title="Copiar link" size="sm" variant="outline" onPress={async () => { await Clipboard.setStringAsync(pageUrl); Alert.alert("Copiado"); }} />
          <Button title="Enviar pra mim" size="sm" variant="outline" onPress={() => Share.share({ message: pageUrl })} />
        </Row>
      </Card>
      {org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="secondary" onPress={() => Linking.openURL(whatsappUrl(org.whatsapp!, `Olá! Sobre minha reserva de ${formatDateLong(ev.starts_at)}.`))} /> : null}
      <Button title={session ? "Minhas festas" : "Entrar com meu celular para ver todas as minhas festas"} variant="ghost" size="sm" onPress={() => router.replace(session ? "/cliente" : "/entrar")} />
    </Screen>
  );
}
