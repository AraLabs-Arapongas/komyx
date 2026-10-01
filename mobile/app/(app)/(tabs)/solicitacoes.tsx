import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatPhone, whatsappUrl } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, Empty, Loading, Muted, Row, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

type Req = { id: string; name: string; whatsapp: string; desired_date: string | null; desired_time: string | null; adults: number | null; children: number | null; participants: number | null; message: string | null; source: string | null; estimated_total: number | null; status: "NEW" | "CONVERTED" | "ARCHIVED"; created_at: string; event_id: string | null };

export default function Solicitacoes() {
  const { org } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"NEW" | "ALL">("NEW");
  const q = useQuery({
    queryKey: ["requests", tab],
    queryFn: async () => {
      let query = supabase.from("public_requests").select("*").order("created_at", { ascending: false }).limit(50);
      if (tab === "NEW") query = query.eq("status", "NEW");
      const { data } = await query;
      return (data ?? []) as Req[];
    },
  });
  const archive = useMutation({
    mutationFn: async (id: string) => { await supabase.from("public_requests").update({ status: "ARCHIVED" }).eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requests"] }); qc.invalidateQueries({ queryKey: ["home"] }); },
  });

  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      <Row>
        {(["NEW", "ALL"] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: tab === t ? colors.brand : colors.surface, borderWidth: 1, borderColor: tab === t ? colors.brand : colors.border }}>
            <Text style={{ color: tab === t ? "#fff" : colors.muted, fontWeight: "600", fontSize: 13 }}>{t === "NEW" ? "Novas" : "Todas"}</Text>
          </Pressable>
        ))}
      </Row>
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <Empty title="Nenhuma solicitação" description="Pedidos feitos pela sua página pública aparecem aqui." /> : q.data!.map((r) => (
        <Card key={r.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.cardTitle}>{r.name}</Text>
            <Badge tone={r.status === "NEW" ? "amber" : r.status === "CONVERTED" ? "green" : "zinc"}>{r.status === "NEW" ? "Nova" : r.status === "CONVERTED" ? "Virou evento" : "Arquivada"}</Badge>
          </Row>
          <Muted>{formatPhone(r.whatsapp)} · {formatDateTime(r.created_at)}{r.source ? ` · via ${r.source}` : ""}</Muted>
          <Text style={styles.text}>
            {r.desired_date ? `Data: ${r.desired_date.split("-").reverse().join("/")}${r.desired_time ? ` às ${String(r.desired_time).slice(0, 5)}` : ""}` : "Sem data definida"}
            {" · "}{r.adults != null || r.children != null ? `${r.adults ?? 0} adultos, ${r.children ?? 0} crianças` : r.participants ? `${r.participants} pessoas` : "pessoas a definir"}
          </Text>
          {r.message ? <View style={{ backgroundColor: colors.stone50, borderRadius: 10, padding: 10 }}><Text style={styles.text}>“{r.message}”</Text></View> : null}
          <Row style={{ flexWrap: "wrap" }}>
            <Button title="Responder no WhatsApp" size="sm" variant="secondary" onPress={() => Linking.openURL(whatsappUrl(r.whatsapp, `Olá ${r.name.split(" ")[0]}! Aqui é do ${org?.name}. Recebemos seu pedido de orçamento${r.desired_date ? ` para ${r.desired_date.split("-").reverse().join("/")}` : ""}.`))} />
            {r.status === "NEW" ? <Button title="Arquivar" size="sm" variant="ghost" onPress={() => archive.mutate(r.id)} /> : null}
          </Row>
          {r.status === "NEW" ? <Muted style={{ fontSize: 11 }}>Para transformar em orçamento com data reservada, use o Festeja na web (Solicitações → Criar orçamento).</Muted> : null}
        </Card>
      ))}
    </Screen>
  );
}
