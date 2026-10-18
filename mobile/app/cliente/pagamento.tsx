import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useParty } from "@/lib/party-context";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { formatCurrency } from "@/lib/format";
import { dueShort } from "@/lib/installments";
import { maskMoney, moneyInput, parseMoney, useReservationView } from "@/lib/reservation-view";
import { Button, Card, CardTitle, Divider, Empty, Field, Input, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Pagamento() {
  const { token, ready } = useParty();
  const { q, view, ask } = useReservationView(token ?? "", { refetchOnFocus: true });
  const [showPayload, setShowPayload] = useState(false);
  // "Pagar outro valor": same key and txid, an amount the client picks (R$ 1 up to what is owed).
  const [otherOpen, setOtherOpen] = useState(false);
  const [other, setOther] = useState("");
  const [custom, setCustom] = useState<number | null>(null);
  // "Já paguei": the client says how much actually went.
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [paid, setPaid] = useState("");
  if (!ready || (token && q.isLoading)) return <Loading />;
  if (!token) return <Screen><Empty title="Escolha uma festa" description="Em Início, toque na festa que você quer acompanhar." /><Button title="Ir para Início" variant="secondary" onPress={() => router.replace("/cliente")} /></Screen>;
  if (!view) return <Screen><Empty title="Reserva não encontrada" /></Screen>;
  const { r, org, quote, showPrices, installments, extrasTotal, total, balance, needsDeposit, txid, pixAmount, pixFor, pending, first } = view;
  if (!quote || !showPrices) return <Screen><Empty title="Valores combinados com o buffet" description={org.whatsapp ? "Este buffet trata pagamentos direto com você. Fale com eles pelo WhatsApp." : "Este buffet trata pagamentos direto com você."} />{org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="secondary" onPress={() => view.wa("Olá! Sobre o pagamento da minha festa.")} /> : null}</Screen>;
  // Custom amount only while it still fits what is owed (a payment may have landed meanwhile).
  const amount = custom && custom <= balance ? custom : pixAmount;
  const pix = amount ? pixFor(amount) : null;
  const otherValue = parseMoney(other);
  const otherError = other && otherValue < 1 ? "Mínimo R$ 1,00." : other && otherValue > balance ? `Máximo ${formatCurrency(balance)} (o que falta pagar).` : null;
  const paidValue = parseMoney(paid);
  const paidError = paid && paidValue < 1 ? "Mínimo R$ 1,00." : paid && paidValue > balance ? `Passa do que falta pagar (${formatCurrency(balance)}).` : null;
  const noticePending = pending.some((x) => x.kind === "PAYMENT_NOTICE");
  const sendNotice = () => ask.mutate(
    { kind: "PAYMENT_NOTICE", message: `${first} avisou que pagou ${formatCurrency(paidValue)} por Pix (${txid}).`, payload: { amount: paidValue, txid } },
    { onSuccess: () => { setNoticeOpen(false); setPaid(""); } },
  );

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()} resetScrollKey={token}>
      {pix ? (
        <Card tone="brand">
          <CardTitle title={custom && amount === custom ? "Pagar outro valor por Pix" : needsDeposit ? "Pague o sinal por Pix" : "Pagar o que falta por Pix"} subtitle={`${formatCurrency(amount!)} · identificador ${txid}`} />
          <View style={{ alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16 }}><QRCode value={pix} size={200} /></View>
          <Button title="Copiar código Pix (copia e cola)" onPress={async () => { await Clipboard.setStringAsync(pix); Alert.alert("Copiado", "Abra o app do seu banco e cole em Pix copia e cola."); }} />
          <Row style={{ justifyContent: "space-between" }}>
            <Muted>Chave: {org.pix_key}</Muted>
            <Pressable onPress={async () => { await Clipboard.setStringAsync(org.pix_key!); Alert.alert("Chave copiada"); }}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>Copiar chave</Text></Pressable>
          </Row>
          {custom && amount === custom ? (
            <Button title={`Voltar ao valor sugerido (${formatCurrency(pixAmount!)})`} variant="ghost" size="sm" onPress={() => { setCustom(null); setOther(""); }} />
          ) : otherOpen ? (
            <View style={{ gap: 8 }}>
              <Field label="Quanto você quer pagar agora?" error={otherError}>
                <Input value={other} onChangeText={(v) => setOther(maskMoney(v))} keyboardType="number-pad" placeholder="0,00" autoFocus />
              </Field>
              <Muted>De R$ 1,00 até {formatCurrency(balance)}. Bom para dividir o pagamento.</Muted>
              <Row>
                <Button title="Gerar Pix" size="sm" disabled={!other || Boolean(otherError)} onPress={() => { setCustom(otherValue); setOtherOpen(false); setPaid(moneyInput(otherValue)); }} />
                <Button title="Cancelar" variant="ghost" size="sm" onPress={() => { setOtherOpen(false); setOther(""); }} />
              </Row>
            </View>
          ) : balance >= 1 ? (
            <Button title="Pagar outro valor" variant="secondary" size="sm" onPress={() => setOtherOpen(true)} />
          ) : null}
          {noticePending ? (
            <Muted>Você já avisou um pagamento. Assim que o buffet conferir, dá para avisar outro.</Muted>
          ) : noticeOpen ? (
            <View style={{ gap: 8 }}>
              <Field label="Quanto você pagou?" error={paidError}>
                <Input value={paid} onChangeText={(v) => setPaid(maskMoney(v))} keyboardType="number-pad" placeholder="0,00" autoFocus />
              </Field>
              <Row>
                <Button title="Avisar o buffet" size="sm" loading={ask.isPending} disabled={!paid || Boolean(paidError)} onPress={sendNotice} />
                <Button title="Cancelar" variant="ghost" size="sm" disabled={ask.isPending} onPress={() => setNoticeOpen(false)} />
              </Row>
            </View>
          ) : (
            <Button title="Já paguei, avisar o buffet" variant="outline" size="sm" onPress={() => { setPaid((v) => v || moneyInput(amount)); setNoticeOpen(true); }} />
          )}
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
