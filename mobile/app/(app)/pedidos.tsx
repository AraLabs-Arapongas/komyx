import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { approveRequest, loadOwnerRequests, noticeAlreadyRecorded, rejectRequest, REQUEST_KIND_LABEL, type OwnerRequest } from "@/lib/change-requests";
import { formatCurrency, formatDate, formatDateTime, whatsappUrl } from "@/lib/format";
import { Badge, Button, Card, Empty, Input, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

const STATUS: Record<OwnerRequest["status"], { label: string; tone: "amber" | "green" | "red" }> = { PENDING: { label: "Aguardando", tone: "amber" }, APPROVED: { label: "Aprovado", tone: "green" }, REJECTED: { label: "Recusado", tone: "red" } };

function RequestCard({ r }: { r: OwnerRequest }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const needsPrice = r.kind === "EXTRA" && r.payload?.price == null;
  const [price, setPrice] = useState(r.kind === "PAYMENT_NOTICE" && r.payload?.amount ? String(r.payload.amount).replace(".", ",") : "");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["owner-requests"] }); qc.invalidateQueries({ queryKey: ["pending-requests"] }); qc.invalidateQueries({ queryKey: ["home"] }); };
  const typedPrice = price ? Number(price.replace(/\./g, "").replace(",", ".")) : undefined;
  const approve = useMutation({ mutationFn: () => approveRequest(r, profile!.organization_id, profile!.id, typedPrice), onSuccess: refresh, onError: (e) => Alert.alert("Aprovar", (e as Error).message) });
  const recorded = useMutation({ mutationFn: () => noticeAlreadyRecorded(r), onSuccess: refresh, onError: (e) => Alert.alert("Pagamento", (e as Error).message) });
  const reject = useMutation({ mutationFn: () => rejectRequest(r.id), onSuccess: refresh, onError: (e) => Alert.alert("Recusar", (e as Error).message) });
  const ev = r.events;
  const who = ev?.customers?.name ?? "Cliente";
  const detail = r.kind === "EXTRA" ? `${r.payload?.description ?? r.message ?? "Extra"}${r.payload?.price != null ? ` · ${formatCurrency(r.payload.price)}` : ""}`
    : r.kind === "PEOPLE" ? `De ${ev?.adults ?? 0} adultos e ${ev?.children ?? 0} crianças para ${r.payload?.adults ?? ev?.adults ?? 0} e ${r.payload?.children ?? ev?.children ?? 0}`
    : r.kind === "PAYMENT_NOTICE" ? `${r.payload?.amount ? formatCurrency(r.payload.amount) : "Valor não informado"}${r.payload?.txid ? ` · ${r.payload.txid}` : ""}`
    : r.message ?? "";
  const approveLabel = r.kind === "PAYMENT_NOTICE" ? "Pix conferido, registrar" : r.kind === "EXTRA" ? "Incluir na festa" : r.kind === "PEOPLE" ? "Aplicar" : "Marcar como resolvido";

  return (
    <Card>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{REQUEST_KIND_LABEL[r.kind]}</Text>
          <Pressable onPress={() => router.push({ pathname: "/(app)/eventos/[id]", params: { id: r.event_id } })}>
            <Muted>{who} · {ev?.title ?? "Festa"} · {ev ? formatDate(ev.starts_at) : ""}</Muted>
          </Pressable>
        </View>
        <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
      </Row>
      {detail ? <Text style={styles.text}>{detail}</Text> : null}
      {r.message && r.kind === "EXTRA" && r.payload?.description && r.message !== r.payload.description ? <Muted>“{r.message}”</Muted> : null}
      <Muted style={{ fontSize: 11 }}>{formatDateTime(r.created_at)}</Muted>
      {r.status === "PENDING" ? (
        <>
          {needsPrice || r.kind === "PAYMENT_NOTICE" ? (
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>{r.kind === "PAYMENT_NOTICE" ? "Valor que caiu na conta" : "Preço do extra"}</Text>
              <Input value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0,00" />
            </View>
          ) : null}
          <Row style={{ flexWrap: "wrap" }}>
            <Button title={approveLabel} size="sm" loading={approve.isPending} disabled={reject.isPending || ((needsPrice || r.kind === "PAYMENT_NOTICE") && !(typedPrice && typedPrice > 0))} onPress={() => approve.mutate()} />
            {r.kind === "PAYMENT_NOTICE" ? <Button title="Já registrei" size="sm" variant="outline" loading={recorded.isPending} disabled={approve.isPending} onPress={() => recorded.mutate()} /> : null}
            <Button title="Recusar" size="sm" variant="ghost" loading={reject.isPending} disabled={approve.isPending} onPress={() => Alert.alert("Recusar pedido", "O cliente verá o pedido como não aprovado.", [{ text: "Voltar", style: "cancel" }, { text: "Recusar", style: "destructive", onPress: () => reject.mutate() }])} />
            {ev?.customers ? <Button title="WhatsApp" size="sm" variant="secondary" onPress={() => Linking.openURL(whatsappUrl(ev.customers!.whatsapp, `Olá ${who.split(" ")[0]}! Sobre o seu pedido para a festa: `))} /> : null}
          </Row>
        </>
      ) : null}
    </Card>
  );
}

/** Requests the party owners sent from their app: extras, head counts, "já paguei", other. */
export default function Pedidos() {
  const [tab, setTab] = useState<"PENDING" | "ALL">("PENDING");
  const q = useQuery({ queryKey: ["owner-requests", tab], queryFn: () => loadOwnerRequests(tab === "PENDING") });
  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Row>
        {(["PENDING", "ALL"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: tab === t ? colors.brand : colors.surface, borderWidth: 1, borderColor: tab === t ? colors.brand : colors.border }}>
            <Text style={{ color: tab === t ? "#fff" : colors.muted, fontWeight: "600", fontSize: 13 }}>{t === "PENDING" ? "Aguardando" : "Todos"}</Text>
          </Pressable>
        ))}
      </Row>
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <Empty title={tab === "PENDING" ? "Nenhum pedido aguardando" : "Nenhum pedido ainda"} description="Pedidos que os clientes fazem pelo app (extra, mais gente, já paguei) aparecem aqui." /> : q.data!.map((r) => <RequestCard key={r.id} r={r} />)}
    </Screen>
  );
}
