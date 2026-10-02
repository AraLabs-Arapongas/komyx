import * as Clipboard from "expo-clipboard";
import { useGlobalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { formatCurrency } from "@/lib/format";
import { dueShort } from "@/lib/installments";
import { useReservationView } from "@/lib/reservation-view";
import { Button, Card, CardTitle, Divider, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Pagamento() {
  const { token } = useGlobalSearchParams<{ token: string }>();
  const { q, view, ask } = useReservationView(token);
  const [showPayload, setShowPayload] = useState(false);
  if (q.isLoading) return <Loading />;
  if (!view) return <Screen><Empty title="Reserva não encontrada" /></Screen>;
  const { r, org, quote, showPrices, installments, extrasTotal, total, balance, needsDeposit, txid, pixAmount, pix, pending, first } = view;
  if (!quote || !showPrices) return <Screen><Empty title="Valores combinados com o buffet" description={org.whatsapp ? "Este buffet trata pagamentos direto com você. Fale com eles pelo WhatsApp." : "Este buffet trata pagamentos direto com você."} />{org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="secondary" onPress={() => view.wa("Olá! Sobre o pagamento da minha festa.")} /> : null}</Screen>;

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {pix ? (
        <Card tone="brand">
          <CardTitle title={needsDeposit ? "Pague o sinal por Pix" : "Pagar o que falta por Pix"} subtitle={`${formatCurrency(pixAmount!)} · identificador ${txid}`} />
          <View style={{ alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16 }}><QRCode value={pix} size={200} /></View>
          <Button title="Copiar código Pix (copia e cola)" onPress={async () => { await Clipboard.setStringAsync(pix); Alert.alert("Copiado", "Abra o app do seu banco e cole em Pix copia e cola."); }} />
          <Row style={{ justifyContent: "space-between" }}>
            <Muted>Chave: {org.pix_key}</Muted>
            <Pressable onPress={async () => { await Clipboard.setStringAsync(org.pix_key!); Alert.alert("Chave copiada"); }}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>Copiar chave</Text></Pressable>
          </Row>
          <Button title="Já paguei, avisar o buffet" variant="outline" size="sm" loading={ask.isPending} disabled={pending.some((x) => x.kind === "PAYMENT_NOTICE")} onPress={() => ask.mutate({ kind: "PAYMENT_NOTICE", message: `${first} avisou que pagou ${formatCurrency(pixAmount!)} por Pix (${txid}).`, payload: { amount: pixAmount, txid } })} />
          <Muted>O buffet confirma assim que vir o Pix com o identificador {txid} no extrato.</Muted>
          <Pressable onPress={() => setShowPayload((v) => !v)}><Text style={{ color: colors.muted, fontSize: 12 }}>{showPayload ? "ocultar código" : "ver código completo"}</Text></Pressable>
          {showPayload ? <Text selectable style={{ fontFamily: "Courier", fontSize: 11, color: colors.muted }}>{pix}</Text> : null}
        </Card>
      ) : balance <= 0 ? (
        <Card tone="brand"><Text style={styles.cardTitle}>Tudo pago. 🎉</Text><Muted>Nenhum valor em aberto para esta festa.</Muted></Card>
      ) : null}

      <Card>
        <CardTitle title="Resumo" subtitle={balance > 0 ? `Falta ${formatCurrency(balance)} de ${formatCurrency(total)}` : `Tudo pago · ${formatCurrency(total)}`} />
        <Row style={{ justifyContent: "space-between" }}><Muted>Orçamento</Muted><Text style={styles.text}>{formatCurrency(quote.total)}</Text></Row>
        {extrasTotal > 0 ? <Row style={{ justifyContent: "space-between" }}><Muted>Extras</Muted><Text style={styles.text}>{formatCurrency(extrasTotal)}</Text></Row> : null}
        <Row style={{ justifyContent: "space-between" }}><Muted>Pago</Muted><Text style={[styles.text, { color: colors.green, fontWeight: "600" }]}>{formatCurrency(r.paid)}</Text></Row>
        {balance > 0 ? <Row style={{ justifyContent: "space-between" }}><Text style={styles.h3}>Falta</Text><Text style={{ fontSize: 18, fontWeight: "800", color: colors.red }}>{formatCurrency(balance)}</Text></Row> : null}
        {installments.length ? <><Divider /><Text style={styles.h3}>Parcelas</Text></> : null}
        {installments.map((i, idx) => (
          <Row key={idx} style={{ justifyContent: "space-between" }}>
            <Text style={[styles.text, { flex: 1 }]}>{i.status === "PAID" ? "✓ " : ""}{idx + 1}. {i.label} <Muted>· {dueShort(i.due)}</Muted></Text>
            <Text style={{ fontWeight: "600", color: i.status === "PAID" ? colors.green : i.status === "PARTIAL" ? colors.amber : i.status === "OVERDUE" ? colors.red : colors.foreground }}>{i.status === "PARTIAL" ? `falta ${formatCurrency(i.remaining)}` : formatCurrency(i.amountNum)}</Text>
          </Row>
        ))}
      </Card>
      {org.whatsapp ? <Button title="Dúvida sobre o pagamento? Falar com o buffet" variant="ghost" size="sm" onPress={() => view.wa("Olá! Tenho uma dúvida sobre o pagamento da minha festa.")} /> : null}
    </Screen>
  );
}
