import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, Share, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { addHours, formatCurrency, formatDate, formatDateLong, formatDateTime, formatPhone, formatTime, toDateKey, whatsappUrl } from "@/lib/format";
import { allocateInstallments, dueShort, INSTALLMENT_STATUS_LABEL, INSTALLMENT_STATUS_TONE, type InstallmentLike } from "@/lib/installments";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, PAYMENT_METHOD_LABEL, QUOTE_STATUS_LABEL, type EventStatus, type PaymentMethod } from "@/lib/labels";
import { eventTitle, type Financials } from "@/lib/queries";
import { confirmEventRemote } from "@/lib/confirm";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Badge, Button, Card, CardTitle, Divider, Input, Loading, Muted, Row, Screen, Stat, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

type Guest = { id: string; name: string; adults: number; children: number; source: string; notes: string | null; checked_in_at: string | null; checked_in_adults: number; checked_in_children: number };
type Payment = { id: string; amount: number; paid_at: string; method: PaymentMethod; notes: string | null };
type Extra = { id: string; description: string; quantity: number; unit_price: number; total: number; source: string };

async function loadEvent(id: string) {
  const [ev, guests, payments, quotes, links, extras, fin] = await Promise.all([
    supabase.from("events").select("*, customers(id, name, whatsapp, email), packages(name)").eq("id", id).maybeSingle(),
    supabase.from("guests").select("id, name, adults, children, source, notes, checked_in_at, checked_in_adults, checked_in_children").eq("event_id", id).order("created_at"),
    supabase.from("payments").select("id, amount, paid_at, method, notes").eq("event_id", id).order("paid_at", { ascending: false }),
    supabase.from("quotes").select("id, status, total, decided_at, created_at, quote_installments(sequence, label, percent, amount, rule, days_before, due_date)").eq("event_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.from("public_links").select("id, token, short, type").eq("event_id", id).eq("active", true),
    supabase.from("event_extras").select("id, description, quantity, unit_price, total, source").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("event_financials").select("*").eq("event_id", id).maybeSingle(),
  ]);
  return { event: ev.data, guests: (guests.data ?? []) as Guest[], payments: (payments.data ?? []) as Payment[], quote: quotes.data?.[0] ?? null, links: links.data ?? [], extras: (extras.data ?? []) as Extra[], fin: fin.data as Financials | null };
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { org, profile } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["event", id], queryFn: () => loadEvent(id) });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["event", id] }); qc.invalidateQueries({ queryKey: ["home"] }); qc.invalidateQueries({ queryKey: ["agenda"] }); };
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("PIX");
  const [guestName, setGuestName] = useState("");
  const [guestAdults, setGuestAdults] = useState("1");
  const [guestChildren, setGuestChildren] = useState("0");
  const [extraDesc, setExtraDesc] = useState("");
  const [extraPrice, setExtraPrice] = useState("");
  const [extraQty, setExtraQty] = useState("1");

  const setStatus = useMutation({
    mutationFn: async (status: EventStatus) => {
      if (status === "CONFIRMED") { await confirmEventRemote(id, { confirm: true }); return; }
      const patch: Record<string, unknown> = { status };
      if (status === "PRE_RESERVED") patch.expires_at = addHours(new Date(), org?.pre_reservation_validity_hours ?? 48).toISOString();
      if (status === "QUOTE" || status === "CANCELLED") patch.expires_at = null;
      const { error } = await supabase.from("events").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e) => Alert.alert("Não foi possível", e.message.includes("already") || e.message.includes("conflict") || e.message.includes("ocupad") ? "Já existe outro evento bloqueando esse horário." : e.message),
  });
  const addPayment = useMutation({
    mutationFn: async (p: { amount: number; method: PaymentMethod; notes?: string | null }) => {
      // Through the server routine: a first payment on a pre-reservation also confirms the party.
      await confirmEventRemote(id, { payment: { amount: p.amount, method: p.method, paid_at: toDateKey(new Date()), notes: p.notes ?? null } });
    },
    onSuccess: () => { setPayAmount(""); invalidate(); },
    onError: (e) => Alert.alert("Erro", e.message),
  });
  const removePayment = useMutation({ mutationFn: async (pid: string) => { await supabase.from("payments").delete().eq("id", pid); }, onSuccess: invalidate });
  const checkIn = useMutation({
    mutationFn: async (g: Guest) => {
      const arrived = Boolean(g.checked_in_at);
      await supabase.from("guests").update(arrived ? { checked_in_at: null, checked_in_adults: 0, checked_in_children: 0 } : { checked_in_at: new Date().toISOString(), checked_in_adults: g.adults, checked_in_children: g.children }).eq("id", g.id);
    },
    onSuccess: invalidate,
  });
  const addGuest = useMutation({
    mutationFn: async () => {
      if (guestName.trim().length < 2) throw new Error("Informe o nome.");
      const { error } = await supabase.from("guests").insert({ organization_id: profile!.organization_id, event_id: id, name: guestName.trim(), adults: Number(guestAdults) || 0, children: Number(guestChildren) || 0, source: "MANUAL" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setGuestName(""); setGuestAdults("1"); setGuestChildren("0"); invalidate(); },
    onError: (e) => Alert.alert("Erro", e.message),
  });
  const removeGuest = useMutation({ mutationFn: async (gid: string) => { await supabase.from("guests").delete().eq("id", gid); }, onSuccess: invalidate });
  const addExtra = useMutation({
    mutationFn: async () => {
      const price = Number(extraPrice.replace(/\./g, "").replace(",", "."));
      if (!extraDesc.trim() || !(price > 0)) throw new Error("Informe descrição e valor.");
      const { error } = await supabase.from("event_extras").insert({ organization_id: profile!.organization_id, event_id: id, description: extraDesc.trim(), quantity: Number(extraQty.replace(",", ".")) || 1, unit_price: price, source: "STAFF", created_by: profile!.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setExtraDesc(""); setExtraPrice(""); setExtraQty("1"); invalidate(); },
    onError: (e) => Alert.alert("Erro", e.message),
  });
  const removeExtra = useMutation({ mutationFn: async (xid: string) => { await supabase.from("event_extras").delete().eq("id", xid); }, onSuccess: invalidate });
  const ensureLink = useMutation({
    mutationFn: async (type: "RESERVATION" | "GUEST_CONFIRM" | "CHECKIN") => {
      const existing = q.data?.links.find((l) => l.type === type);
      if (existing) return existing.short as string;
      const { data, error } = await supabase.from("public_links").insert({ organization_id: profile!.organization_id, event_id: id, type, created_by: profile!.id }).select("short").single();
      if (error) throw new Error(error.message);
      return data.short as string;
    },
    onSuccess: invalidate,
  });

  async function shareLink(type: "RESERVATION" | "GUEST_CONFIRM" | "CHECKIN") {
    const short = await ensureLink.mutateAsync(type);
    const url = `${WEB_URL}/o/${short}`;
    const label = type === "RESERVATION" ? `Sua reserva no ${org?.name} (Pix, orçamento e contrato): ` : type === "GUEST_CONFIRM" ? `Confirme presença: ` : `Portaria da festa: `;
    await Share.share({ message: `${label}${url}` });
  }

  if (q.isLoading || !q.data) return <Loading />;
  const { event: ev, guests, payments, quote, extras, fin } = q.data;
  if (!ev) return <Screen><Muted>Evento não encontrado.</Muted></Screen>;
  const customer = ev.customers as { id: string; name: string; whatsapp: string; email: string | null };
  const title = eventTitle(ev as never);
  const status = ev.status as EventStatus;
  const paid = Number(fin?.paid_total ?? 0);
  const installments = quote ? allocateInstallments(quote.quote_installments as InstallmentLike[], paid, ev.starts_at, quote.decided_at) : [];
  const deposit = installments[0]?.amountNum ?? null;
  const methods = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
        <Muted>{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)} · {ev.packages?.name ?? "Personalizado"} · {ev.adults ?? 0} adultos, {ev.children ?? 0} crianças{ev.celebrant_name ? ` · ${ev.celebrant_name}${ev.celebrant_age != null ? `, ${ev.celebrant_age} anos` : ""}` : ""}</Muted>

        <Card>
          <Row style={{ flexWrap: "wrap" }}>
            <Badge tone={EVENT_STATUS_TONE[status]}>{EVENT_STATUS_LABEL[status]}</Badge>
            {ev.origin === "SELF_SERVICE" ? <Badge tone="brand">Reserva online</Badge> : null}
            {fin?.payment_status ? <Badge tone={fin.payment_status === "PAID" ? "green" : fin.payment_status === "PARTIAL" ? "amber" : "red"}>{fin.payment_status === "PAID" ? "Pago" : fin.payment_status === "PARTIAL" ? "Parcial" : "Não pago"}</Badge> : null}
          </Row>
          {status === "PRE_RESERVED" && ev.expires_at ? <Muted>Data reservada até {formatDateTime(ev.expires_at)}. Confirme ou libere.</Muted> : null}
          {status === "QUOTE" ? <Muted>Só orçamento: a data não está bloqueada.</Muted> : null}
          {status === "EXPIRED" ? <Muted>Reserva vencida. Renove para bloquear de novo.</Muted> : null}
          <Row style={{ flexWrap: "wrap", rowGap: 10 }}>
            <View style={{ width: "48%" }}><Stat label="Orçamento" value={formatCurrency(fin?.quote_total)} /></View>
            <View style={{ width: "48%" }}><Stat label="Extras" value={formatCurrency(fin?.extras_total)} /></View>
            <View style={{ width: "48%" }}><Stat label="Pago" value={formatCurrency(fin?.paid_total)} /></View>
            <View style={{ width: "48%" }}><Stat label="Falta receber" value={formatCurrency(fin?.balance)} strong /></View>
          </Row>
          {ev.pix_txid && (status === "PRE_RESERVED" || status === "EXPIRED") ? (
            <View style={{ backgroundColor: colors.greenSoft, borderRadius: 12, padding: 12, gap: 8 }}>
              <Text style={styles.text}><Text style={{ fontWeight: "700" }}>Reserva online.</Text> Procure no extrato um Pix com identificador <Text style={{ fontFamily: "Courier", fontWeight: "700" }}>{ev.pix_txid}</Text>{deposit ? ` de ${formatCurrency(deposit)}` : ""}.</Text>
              <Button title="Sinal recebido · confirmar festa" variant="success" size="sm" onPress={async () => {
                await addPayment.mutateAsync({ amount: deposit ?? 0, method: "PIX", notes: "Sinal da reserva online (Pix conferido no extrato)" });
                if (quote && quote.status !== "ACCEPTED") await supabase.from("quotes").update({ status: "ACCEPTED" }).eq("id", quote.id);
                setStatus.mutate("CONFIRMED");
              }} />
            </View>
          ) : null}
          <Row style={{ flexWrap: "wrap" }}>
            {status === "QUOTE" ? <><Button title="Reservar a data" size="sm" onPress={() => setStatus.mutate("PRE_RESERVED")} /><Button title="Confirmar" size="sm" variant="outline" onPress={() => setStatus.mutate("CONFIRMED")} /></> : null}
            {status === "PRE_RESERVED" ? <><Button title="Confirmar evento" size="sm" onPress={() => setStatus.mutate("CONFIRMED")} /><Button title="Renovar prazo" size="sm" variant="outline" onPress={() => setStatus.mutate("PRE_RESERVED")} /><Button title="Liberar a data" size="sm" variant="ghost" onPress={() => setStatus.mutate("QUOTE")} /></> : null}
            {status === "EXPIRED" ? <><Button title="Renovar reserva" size="sm" onPress={() => setStatus.mutate("PRE_RESERVED")} /><Button title="Confirmar" size="sm" variant="outline" onPress={() => setStatus.mutate("CONFIRMED")} /></> : null}
            {status === "CONFIRMED" ? <><Button title="Marcar como realizado" size="sm" onPress={() => setStatus.mutate("DONE")} /><Button title="Voltar a reserva" size="sm" variant="outline" onPress={() => setStatus.mutate("PRE_RESERVED")} /></> : null}
            {status === "DONE" ? <Button title="Reabrir como confirmado" size="sm" variant="outline" onPress={() => setStatus.mutate("CONFIRMED")} /> : null}
            {status === "CANCELLED" ? <Button title="Reabrir como reserva" size="sm" variant="outline" onPress={() => setStatus.mutate("PRE_RESERVED")} /> : null}
            {status !== "CANCELLED" && status !== "DONE" ? <Button title="Cancelar" size="sm" variant="danger" onPress={() => Alert.alert("Cancelar evento?", "A data volta a ficar livre.", [{ text: "Voltar" }, { text: "Cancelar evento", style: "destructive", onPress: () => setStatus.mutate("CANCELLED") }])} /> : null}
          </Row>
        </Card>

        <Card>
          <CardTitle title="Cliente" />
          <Text style={styles.h3}>{customer.name}</Text>
          <Muted>{formatPhone(customer.whatsapp)}{customer.email ? ` · ${customer.email}` : ""}</Muted>
          <Row style={{ flexWrap: "wrap" }}>
            <Button title="WhatsApp" size="sm" variant="secondary" icon={<Ionicons name="logo-whatsapp" size={16} color={colors.brand} />} onPress={() => Linking.openURL(whatsappUrl(customer.whatsapp, `Olá ${customer.name.split(" ")[0]}! Aqui é do ${org?.name}. Sobre a festa de ${formatDate(ev.starts_at)} às ${formatTime(ev.starts_at)}.`))} />
            <Button title="Ligar" size="sm" variant="outline" onPress={() => Linking.openURL(`tel:+55${customer.whatsapp}`)} />
            <Button title="Enviar página da reserva" size="sm" variant="outline" onPress={() => shareLink("RESERVATION")} />
          </Row>
        </Card>

        <Card>
          <CardTitle title="Pagamentos" subtitle={`Pago ${formatCurrency(paid)} · falta receber ${formatCurrency(fin?.balance)}`} />
          {quote ? (
            <Row style={{ justifyContent: "space-between" }}>
              <Muted>Orçamento {QUOTE_STATUS_LABEL[quote.status] ?? quote.status} · {formatCurrency(quote.total)}</Muted>
              <Pressable onPress={() => Linking.openURL(`${WEB_URL}/eventos/${id}/orcamento?quote=${quote.id}`)}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>Abrir na web</Text></Pressable>
            </Row>
          ) : <Muted>Sem orçamento ainda. Monte pelo Komyx na web.</Muted>}
          {installments.length ? <Text style={styles.h3}>Parcelas</Text> : null}
          {installments.map((i, idx) => (
            <View key={idx} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 6 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Row style={{ flex: 1 }}>
                  <Ionicons name={i.status === "PAID" ? "checkmark-circle" : "ellipse-outline"} size={18} color={i.status === "PAID" ? colors.green : colors.muted} />
                  <Text style={[styles.text, { flex: 1 }]} numberOfLines={1}>{idx + 1}. {i.label} <Muted>· {dueShort(i.due)}</Muted></Text>
                </Row>
                <Badge tone={INSTALLMENT_STATUS_TONE[i.status]}>{INSTALLMENT_STATUS_LABEL[i.status]}</Badge>
              </Row>
              <Row style={{ justifyContent: "space-between" }}>
                {i.status === "PARTIAL" ? (
                  <View><Text style={{ fontWeight: "700", color: colors.amber }}>Falta {formatCurrency(i.remaining)}</Text><Muted>pago {formatCurrency(i.paid)} de {formatCurrency(i.amountNum)}</Muted></View>
                ) : <Text style={{ fontWeight: "600" }}>{formatCurrency(i.amountNum)}</Text>}
                {i.status !== "PAID" ? <Button title="Recebida" size="sm" variant="success" onPress={() => Alert.alert(`Parcela ${idx + 1} recebida?`, `${formatCurrency(i.remaining)} · como foi pago?`, [{ text: "Voltar", style: "cancel" }, ...methods.slice(0, 4).map((m) => ({ text: PAYMENT_METHOD_LABEL[m], onPress: () => addPayment.mutate({ amount: i.remaining, method: m, notes: `Parcela ${idx + 1} · ${i.label}` }) }))])} /> : null}
              </Row>
            </View>
          ))}
          <Divider />
          <Text style={styles.h3}>Recebimentos</Text>
          {payments.length === 0 ? <Muted>Nenhum pagamento registrado.</Muted> : payments.map((p) => (
            <Row key={p.id} style={{ justifyContent: "space-between" }}>
              <Text style={[styles.text, { flex: 1 }]} numberOfLines={1}><Text style={{ fontWeight: "600" }}>{formatCurrency(p.amount)}</Text> <Muted>· {PAYMENT_METHOD_LABEL[p.method]} · {p.paid_at.split("-").reverse().join("/")}{p.notes ? ` · ${p.notes}` : ""}</Muted></Text>
              <Pressable onPress={() => Alert.alert("Remover pagamento?", undefined, [{ text: "Voltar" }, { text: "Remover", style: "destructive", onPress: () => removePayment.mutate(p.id) }])}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
            </Row>
          ))}
          <Text style={styles.h3}>Registrar pagamento</Text>
          <Row>
            <View style={{ flex: 1 }}><Input value={payAmount} onChangeText={setPayAmount} placeholder="Valor (R$)" keyboardType="decimal-pad" /></View>
            <Pressable onPress={() => setPayMethod(methods[(methods.indexOf(payMethod) + 1) % methods.length])} style={{ height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: "center" }}><Text style={styles.text}>{PAYMENT_METHOD_LABEL[payMethod]}</Text></Pressable>
            <Button title="Adicionar" size="md" variant="secondary" loading={addPayment.isPending} onPress={() => { const v = Number(payAmount.replace(/\./g, "").replace(",", ".")); if (v > 0) addPayment.mutate({ amount: v, method: payMethod }); }} />
          </Row>
        </Card>

        <Card>
          <CardTitle title="Convidados" subtitle={`${fin?.guest_count ?? 0} confirmações · ${fin?.checked_in_total ?? 0}/${fin?.participants_total ?? 0} presentes`} right={<Pressable onPress={() => shareLink("GUEST_CONFIRM")}><Text style={{ color: colors.brand, fontWeight: "600", fontSize: 13 }}>Enviar RSVP</Text></Pressable>} />
          {guests.length === 0 ? <Muted>Nenhum convidado ainda.</Muted> : guests.map((g) => {
            const arrived = Boolean(g.checked_in_at);
            return (
              <Row key={g.id} style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text} numberOfLines={1}>{arrived ? "✓ " : ""}{g.name} <Muted>· {g.adults}A {g.children}C</Muted></Text>
                  <Muted style={{ fontSize: 11 }}>{g.source === "PUBLIC" ? "pelo link" : g.source === "DOOR" ? "na portaria" : "manual"}{g.notes ? ` · ${g.notes}` : ""}</Muted>
                </View>
                <Button title={arrived ? "Desfazer" : "Chegou"} size="sm" variant={arrived ? "ghost" : "outline"} onPress={() => checkIn.mutate(g)} />
                <Pressable onPress={() => removeGuest.mutate(g.id)} style={{ padding: 6 }}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
              </Row>
            );
          })}
          <Divider />
          <Text style={styles.h3}>Adicionar convidado</Text>
          <Row>
            <View style={{ flex: 1 }}><Input value={guestName} onChangeText={setGuestName} placeholder="Nome" /></View>
            <Input value={guestAdults} onChangeText={setGuestAdults} keyboardType="number-pad" style={{ width: 56, textAlign: "center" }} />
            <Input value={guestChildren} onChangeText={setGuestChildren} keyboardType="number-pad" style={{ width: 56, textAlign: "center" }} />
          </Row>
          <Row style={{ justifyContent: "space-between" }}>
            <Muted>adultos · crianças</Muted>
            <Button title="Adicionar" size="sm" variant="secondary" loading={addGuest.isPending} onPress={() => addGuest.mutate()} />
          </Row>
          <Button title="Abrir portaria na web (check-in no dia)" size="sm" variant="outline" onPress={async () => { const sc = await ensureLink.mutateAsync("CHECKIN"); Linking.openURL(`${WEB_URL}/o/${sc}`); }} />
        </Card>

        <Card>
          <CardTitle title="Pedidos extras na festa" subtitle={`Somam ao saldo · ${formatCurrency(fin?.extras_total)}`} />
          {extras.length === 0 ? <Muted>Nenhum pedido extra.</Muted> : extras.map((x) => (
            <Row key={x.id} style={{ justifyContent: "space-between" }}>
              <Text style={[styles.text, { flex: 1 }]} numberOfLines={1}>{x.description} <Muted>· {Number(x.quantity)} × {formatCurrency(x.unit_price)}</Muted></Text>
              <Text style={{ fontWeight: "600" }}>{formatCurrency(x.total)}</Text>
              <Pressable onPress={() => removeExtra.mutate(x.id)} style={{ padding: 6 }}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
            </Row>
          ))}
          <Divider />
          <Row>
            <View style={{ flex: 1 }}><Input value={extraDesc} onChangeText={setExtraDesc} placeholder="Descrição" /></View>
            <Input value={extraQty} onChangeText={setExtraQty} keyboardType="decimal-pad" style={{ width: 52, textAlign: "center" }} />
            <Input value={extraPrice} onChangeText={setExtraPrice} keyboardType="decimal-pad" placeholder="R$" style={{ width: 90 }} />
          </Row>
          <Button title="Adicionar pedido" size="sm" variant="secondary" loading={addExtra.isPending} onPress={() => addExtra.mutate()} />
        </Card>

        <Card>
          <CardTitle title="Mais na web" subtitle="Orçamento, contrato e convite são editados no Komyx web" />
          <Row style={{ flexWrap: "wrap" }}>
            <Button title="Abrir evento na web" size="sm" variant="outline" onPress={() => Linking.openURL(`${WEB_URL}/eventos/${id}`)} />
            <Button title="Copiar link" size="sm" variant="ghost" onPress={async () => { await Clipboard.setStringAsync(`${WEB_URL}/eventos/${id}`); Alert.alert("Copiado"); }} />
          </Row>
        </Card>
      </Screen>
    </>
  );
}
