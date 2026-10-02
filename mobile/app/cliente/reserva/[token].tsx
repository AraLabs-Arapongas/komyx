import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, Linking, Modal, Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/lib/auth";
import { addReservationGuest, loadReservation, removeReservationGuest, requestChange, type Addon, type ChangeRequest } from "@/lib/client";
import { formatCurrency, formatDate, formatDateLong, formatDateTime, formatTime, hoursLeft, whatsappUrl } from "@/lib/format";
import { allocateInstallments, dueShort } from "@/lib/installments";
import { CONTRACT_STATUS_LABEL, EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { buildPixPayload } from "@/lib/pix";
import { WEB_URL } from "@/lib/supabase";
import { Badge, Button, Card, CardTitle, Divider, Empty, Field, Input, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

/**
 * "Minha festa": the party owner's panel. Everything about the party, with the actions that are
 * theirs (guest list, invite, paying by Pix) and requests to the buffet for what needs confirmation
 * (extras, number of people, "I paid").
 */
const REQUEST_LABEL: Record<ChangeRequest["kind"], string> = { EXTRA: "Pedido de extra", PEOPLE: "Mudança de pessoas", PAYMENT_NOTICE: "Aviso de pagamento", OTHER: "Pedido" };
const REQUEST_TONE: Record<ChangeRequest["status"], "amber" | "green" | "red"> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };
const REQUEST_STATUS: Record<ChangeRequest["status"], string> = { PENDING: "aguardando o buffet", APPROVED: "confirmado", REJECTED: "não foi possível" };

export default function Reserva() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reservation", token], queryFn: () => loadReservation(token) });
  const [showPayload, setShowPayload] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestAdults, setGuestAdults] = useState("2");
  const [guestChildren, setGuestChildren] = useState("0");
  const [askSheet, setAskSheet] = useState<null | "menu" | "extra" | "people" | "other">(null);
  const [freeText, setFreeText] = useState("");
  const [peopleAdults, setPeopleAdults] = useState("");
  const [peopleChildren, setPeopleChildren] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["reservation", token] });

  const addGuest = useMutation({ mutationFn: () => addReservationGuest(token, guestName, Number(guestAdults) || 0, Number(guestChildren) || 0), onSuccess: () => { setGuestName(""); setGuestAdults("2"); setGuestChildren("0"); invalidate(); }, onError: (e) => Alert.alert("Convidado", (e as Error).message) });
  const removeGuest = useMutation({ mutationFn: (id: string) => removeReservationGuest(token, id), onSuccess: invalidate, onError: (e) => Alert.alert("Convidado", (e as Error).message) });
  const ask = useMutation({ mutationFn: (v: { kind: ChangeRequest["kind"]; message: string; payload?: Record<string, unknown> }) => requestChange(token, v.kind, v.message, v.payload), onSuccess: () => { setAskSheet(null); setFreeText(""); invalidate(); Alert.alert("Pedido enviado", "O buffet recebeu e confirma com você."); }, onError: (e) => Alert.alert("Pedido", (e as Error).message) });

  if (q.isLoading) return <Loading />;
  const r = q.data;
  if (!r) return <Screen><Empty title="Reserva não encontrada" description="O link pode ter sido desativado. Fale com o buffet." /></Screen>;
  const { event: ev, org, quote } = r;
  const status = ev.status as EventStatus;
  const showPrices = org.show_prices_public;
  const installments = quote ? allocateInstallments(quote.installments, r.paid, ev.starts_at, quote.decided_at) : [];
  const extrasTotal = r.extras.reduce((a, x) => a + Number(x.total ?? x.quantity * x.unit_price), 0);
  const total = (quote?.total ?? 0) + extrasTotal;
  const balance = Math.max(0, Math.round((total - r.paid) * 100) / 100);
  const deposit = installments[0]?.amountNum ?? null;
  const needsDeposit = status === "PRE_RESERVED" && r.paid <= 0;
  const txid = ev.pix_txid ?? `FESTA${ev.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const pixAmount = needsDeposit ? deposit : balance > 0 && status !== "CANCELLED" && status !== "EXPIRED" ? balance : null;
  const pix = org.pix_key && pixAmount ? buildPixPayload({ key: org.pix_key, merchantName: org.legal_name || org.name, merchantCity: (org.city || "SAO PAULO").split("/")[0], amount: pixAmount, txid, description: `${txid} ${needsDeposit ? "sinal" : "saldo"} festa` }) : null;
  const pageUrl = `${WEB_URL}/r/${token}`;
  const daysLeft = Math.ceil((new Date(ev.starts_at).getTime() - Date.now()) / 86_400_000);
  const guestsPeople = r.guests.reduce((a, g) => a + g.adults + g.children, 0);
  const mapsUrl = org.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${org.address}${org.city ? `, ${org.city}` : ""}`)}` : null;
  const pending = r.requests.filter((x) => x.status === "PENDING");
  const first = ev.customer.name.split(" ")[0];
  const wa = (msg: string) => org.whatsapp && Linking.openURL(whatsappUrl(org.whatsapp, msg));

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {/* BUFFET + LOCATION */}
      <Row>
        {org.logo_url ? <Image alt="" source={{ uri: org.logo_url }} style={{ width: 40, height: 40, borderRadius: 10 }} /> : null}
        <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{org.name}</Text><Muted>{org.address ?? org.city ?? ""}</Muted></View>
      </Row>
      {mapsUrl ? (
        <Row>
          <Button title="Como chegar" size="sm" variant="outline" icon={<Ionicons name="navigate-outline" size={16} color={colors.foreground} />} onPress={() => Linking.openURL(mapsUrl)} />
          <Button title="Compartilhar local" size="sm" variant="outline" icon={<Ionicons name="share-outline" size={16} color={colors.foreground} />} onPress={() => Share.share({ message: `${ev.title ?? "Festa"} · ${formatDateLong(ev.starts_at)} às ${formatTime(ev.starts_at)}\n${org.name} · ${org.address}${org.city ? `, ${org.city}` : ""}\n${mapsUrl}` })} />
        </Row>
      ) : null}

      {/* PARTY */}
      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={[styles.title, { flex: 1 }]} numberOfLines={2}>{ev.title ?? `Festa de ${ev.customer.name}`}</Text>
          <Badge tone={EVENT_STATUS_TONE[status]}>{status === "PRE_RESERVED" ? "Reservada" : EVENT_STATUS_LABEL[status]}</Badge>
        </Row>
        <Text style={styles.text}>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}{daysLeft > 0 && status === "CONFIRMED" ? `  ·  faltam ${daysLeft} dia${daysLeft === 1 ? "" : "s"}` : ""}</Text>
        <Muted>{ev.adults ?? 0} adultos · {ev.children ?? 0} crianças{ev.celebrant_name ? ` · ${ev.celebrant_name}${ev.celebrant_age ? `, ${ev.celebrant_age} anos` : ""}` : ""}{ev.theme ? ` · tema ${ev.theme}` : ""}</Muted>
        {status === "PRE_RESERVED" && ev.expires_at ? <Text style={{ color: colors.amber, fontWeight: "600" }}>Data segura até {formatDateTime(ev.expires_at)} ({hoursLeft(ev.expires_at)}h). Pague o sinal até lá para confirmar.</Text> : null}
        {status === "CONFIRMED" ? <Text style={{ color: colors.green, fontWeight: "600" }}>Festa confirmada.{balance > 0 && showPrices ? ` Falta pagar ${formatCurrency(balance)}.` : " Tudo pago."}</Text> : null}
        {status === "EXPIRED" ? <Text style={{ color: colors.red, fontWeight: "600" }}>O prazo do sinal passou e a data foi liberada. Fale com o buffet para reservar de novo.</Text> : null}
      </Card>

      {/* PAYMENT */}
      {quote && showPrices ? (
        <Card>
          <CardTitle title="Pagamento" subtitle={balance > 0 ? `Falta ${formatCurrency(balance)} de ${formatCurrency(total)}` : `Tudo pago · ${formatCurrency(total)}`} />
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
      ) : null}

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
      ) : null}

      {/* QUOTE ITEMS */}
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

      {/* ASK THE BUFFET */}
      <Card>
        <CardTitle title="Pedidos ao buffet" subtitle="Extras, mais gente, outra coisa: você pede, o buffet confirma." right={pending.length ? <Badge tone="amber">{pending.length} aguardando</Badge> : undefined} />
        {r.requests.slice(0, 5).map((x) => (
          <Row key={x.id} style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}><Text style={styles.text}>{REQUEST_LABEL[x.kind]}{x.payload && typeof x.payload.description === "string" ? ` · ${x.payload.description}` : ""}</Text>{x.message && x.kind !== "PAYMENT_NOTICE" ? <Muted>{x.message}</Muted> : null}<Muted>{formatDate(x.created_at)}</Muted></View>
            <Badge tone={REQUEST_TONE[x.status]}>{REQUEST_STATUS[x.status]}</Badge>
          </Row>
        ))}
        <Button title="Pedir algo ao buffet" variant="secondary" onPress={() => setAskSheet("menu")} />
      </Card>

      {/* GUESTS */}
      <Card>
        <CardTitle title="Convidados" subtitle={`${r.guests.length} ${r.guests.length === 1 ? "confirmação" : "confirmações"} · ${guestsPeople} pessoas`} />
        {r.guests.map((g) => (
          <Row key={g.id} style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{g.name} <Muted>· {g.adults}A {g.children}C</Muted></Text>
              <Muted style={{ fontSize: 11 }}>{g.checked_in ? "chegou na festa" : g.source === "PUBLIC" ? "confirmou pelo link" : g.source === "CLIENT" ? "você adicionou" : "adicionado pelo buffet"}</Muted>
            </View>
            {!g.checked_in ? <Pressable onPress={() => Alert.alert("Remover convidado", `Tirar ${g.name} da lista?`, [{ text: "Cancelar", style: "cancel" }, { text: "Remover", style: "destructive", onPress: () => removeGuest.mutate(g.id) }])} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable> : null}
          </Row>
        ))}
        <Divider />
        <Text style={styles.h3}>Adicionar convidado</Text>
        <Field label="Nome"><Input value={guestName} onChangeText={setGuestName} placeholder="Ex.: Tia Lúcia" autoCapitalize="words" /></Field>
        <Row>
          <Field label="Adultos"><Input value={guestAdults} onChangeText={(v: string) => setGuestAdults(v.replace(/\D/g, ""))} keyboardType="number-pad" style={{ width: 70, textAlign: "center" }} /></Field>
          <Field label="Crianças"><Input value={guestChildren} onChangeText={(v: string) => setGuestChildren(v.replace(/\D/g, ""))} keyboardType="number-pad" style={{ width: 70, textAlign: "center" }} /></Field>
          <View style={{ flex: 1, justifyContent: "flex-end" }}><Button title="Adicionar" size="sm" loading={addGuest.isPending} disabled={guestName.trim().length < 2} onPress={() => addGuest.mutate()} /></View>
        </Row>
        {r.guest_token ? <Button title="Enviar link de confirmação aos convidados" variant="outline" onPress={() => Share.share({ message: `Você está convidado: ${ev.title ?? "festa"} · ${formatDateLong(ev.starts_at)} às ${formatTime(ev.starts_at)}. Confirme presença: ${WEB_URL}/g/${r.guest_token}` })} /> : null}
        {r.invite_token ? <Button title="Personalizar o convite" variant="ghost" size="sm" onPress={() => Linking.openURL(`${WEB_URL}/i/${r.invite_token}`)} /> : null}
      </Card>

      {/* CONTRACT */}
      {r.contract ? (
        <Card>
          <CardTitle title={`Contrato nº ${r.contract.number}`} subtitle={CONTRACT_STATUS_LABEL[r.contract.status] ?? r.contract.status} />
          <Button title={r.contract.status === "ACCEPTED" ? "Ver contrato" : "Ler e aceitar o contrato"} variant={r.contract.status === "ACCEPTED" ? "outline" : "primary"} onPress={() => Linking.openURL(`${WEB_URL}/c/${r.contract!.token}`)} />
        </Card>
      ) : null}

      {/* THIS PAGE */}
      <Card>
        <CardTitle title="Esta página" subtitle="Guarde o link para achar sua festa de novo" />
        <Text selectable style={{ color: colors.muted, fontSize: 13 }}>{pageUrl}</Text>
        <Row>
          <Button title="Copiar link" size="sm" variant="outline" onPress={async () => { await Clipboard.setStringAsync(pageUrl); Alert.alert("Copiado"); }} />
          <Button title="Enviar pra mim" size="sm" variant="outline" onPress={() => Share.share({ message: pageUrl })} />
        </Row>
      </Card>
      {org.whatsapp ? <Button title={`Falar com ${org.name}`} variant="secondary" onPress={() => wa(`Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}.`)} /> : null}
      <Button title={session ? "Minhas festas" : "Entrar com meu celular para ver todas as minhas festas"} variant="ghost" size="sm" onPress={() => router.replace(session ? "/cliente" : "/entrar")} />

      {/* ASK SHEET */}
      <Modal visible={askSheet !== null} transparent animationType="slide" onRequestClose={() => setAskSheet(null)}>
        <Pressable onPress={() => setAskSheet(null)} style={{ flex: 1, backgroundColor: "rgba(28,25,23,0.45)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, maxHeight: "80%" }}>
            {askSheet === "menu" ? (
              <>
                <Text style={styles.cardTitle}>O que você quer pedir?</Text>
                {[["extra", "cube-outline", "Um extra (bolo, hora extra, recreação…)"], ["people", "people-outline", "Mudar o número de pessoas"], ["other", "chatbubble-ellipses-outline", "Outra coisa"]].map(([k, icon, label]) => (
                  <Pressable key={k} onPress={() => setAskSheet(k as "extra" | "people" | "other")} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.brand} /><Text style={[styles.text, { flex: 1 }]}>{label}</Text><Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                ))}
                {org.whatsapp ? <Button title="Prefiro falar no WhatsApp" variant="ghost" size="sm" onPress={() => { setAskSheet(null); wa(`Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}: `); }} /> : null}
              </>
            ) : null}
            {askSheet === "extra" ? (
              <>
                <Text style={styles.cardTitle}>Pedir um extra</Text>
                <Muted>O buffet confirma e o valor entra na sua conta da festa.</Muted>
                {r.addons.map((a: Addon) => (
                  <Pressable key={a.id} onPress={() => ask.mutate({ kind: "EXTRA", message: `${first} pediu ${a.name}.`, payload: { addon_id: a.id, description: a.name, price: a.price } })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flex: 1 }}><Text style={styles.text}>{a.name}</Text>{a.description ? <Muted>{a.description}</Muted> : null}</View>
                    {showPrices ? <Text style={{ fontWeight: "700" }}>{formatCurrency(a.price)}</Text> : null}
                  </Pressable>
                ))}
                <Field label="Ou descreva o que quer"><Input value={freeText} onChangeText={setFreeText} placeholder="Ex.: bolo cenográfico de unicórnio" /></Field>
                <Button title="Enviar pedido" loading={ask.isPending} disabled={freeText.trim().length < 3} onPress={() => ask.mutate({ kind: "EXTRA", message: freeText.trim(), payload: { description: freeText.trim() } })} />
              </>
            ) : null}
            {askSheet === "people" ? (
              <>
                <Text style={styles.cardTitle}>Mudar o número de pessoas</Text>
                <Muted>Hoje: {ev.adults ?? 0} adultos · {ev.children ?? 0} crianças. Pessoas além do pacote podem mudar o valor; o buffet confirma.</Muted>
                <Row>
                  <Field label="Adultos"><Input value={peopleAdults} onChangeText={(v: string) => setPeopleAdults(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={String(ev.adults ?? 0)} /></Field>
                  <Field label="Crianças"><Input value={peopleChildren} onChangeText={(v: string) => setPeopleChildren(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={String(ev.children ?? 0)} /></Field>
                </Row>
                <Button title="Enviar pedido" loading={ask.isPending} disabled={!peopleAdults && !peopleChildren} onPress={() => ask.mutate({ kind: "PEOPLE", message: `${first} pediu ${peopleAdults || (ev.adults ?? 0)} adultos e ${peopleChildren || (ev.children ?? 0)} crianças.`, payload: { adults: Number(peopleAdults || ev.adults || 0), children: Number(peopleChildren || ev.children || 0) } })} />
              </>
            ) : null}
            {askSheet === "other" ? (
              <>
                <Text style={styles.cardTitle}>Outro pedido</Text>
                <Field label="Conte para o buffet"><Input value={freeText} onChangeText={setFreeText} placeholder="Ex.: podemos chegar 30 min antes para decorar?" multiline style={{ height: 90, textAlignVertical: "top", paddingTop: 10 }} /></Field>
                <Button title="Enviar" loading={ask.isPending} disabled={freeText.trim().length < 3} onPress={() => ask.mutate({ kind: "OTHER", message: freeText.trim() })} />
              </>
            ) : null}
            <Button title="Fechar" variant="ghost" size="sm" onPress={() => setAskSheet(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
