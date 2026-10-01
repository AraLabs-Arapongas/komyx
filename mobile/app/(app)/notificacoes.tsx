import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Button, Empty, Loading, Muted, Screen, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

type N = { id: string; type: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string };

export default function Notificacoes() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notifications"], queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50)).data as N[] });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread"] }); };
  const markAll = useMutation({ mutationFn: async () => { await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); }, onSuccess: invalidate });
  const markOne = useMutation({ mutationFn: async (id: string) => { await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id); }, onSuccess: invalidate });

  function open(n: N) {
    if (!n.read_at) markOne.mutate(n.id);
    const m = n.href?.match(/\/eventos\/([0-9a-f-]{36})/);
    if (m) router.push({ pathname: "/(app)/eventos/[id]", params: { id: m[1] } });
    else if (n.href?.startsWith("/solicitacoes")) router.push("/(app)/(tabs)/solicitacoes");
  }

  const unread = (q.data ?? []).filter((n) => !n.read_at).length;
  return (
    <Screen refreshing={q.isFetching} onRefresh={() => q.refetch()}>
      {unread ? <Button title={`Marcar ${unread} como lidas`} variant="outline" size="sm" onPress={() => markAll.mutate()} /> : null}
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <Empty title="Sem notificações" description="Pedidos de orçamento, reservas online e contratos aceitos aparecem aqui." /> : q.data!.map((n) => (
        <Pressable key={n.id} onPress={() => open(n)} style={{ backgroundColor: n.read_at ? colors.surface : colors.brandSoft, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={[styles.h3, { flex: 1 }]}>{n.title}</Text>
            {!n.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 }} /> : null}
          </View>
          {n.body ? <Text style={styles.text}>{n.body}</Text> : null}
          <Muted>{formatDateTime(n.created_at)}</Muted>
        </Pressable>
      ))}
    </Screen>
  );
}
