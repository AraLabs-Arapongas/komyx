import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useParty } from "@/lib/party-context";
import { supabase } from "@/lib/supabase";
import { KomyxLogo } from "@/ui/brand";
import { PartyCard, type Party } from "@/ui/client/party-card";
import { Loading } from "@/ui/components";
import { PartyBackdrop, party } from "@/ui/party";

/**
 * Full-screen chooser: which party to follow. Shown before Início the first time there is more
 * than one party, and again from "Trocar de festa". Picking one puts it in context.
 */
export default function EscolherFesta() {
  const { session } = useAuth();
  const { token, setToken } = useParty();
  const q = useQuery({ queryKey: ["my-reservations"], queryFn: async () => { const { data, error } = await supabase.rpc("my_reservations"); if (error) throw error; return (data ?? []) as Party[]; }, enabled: Boolean(session) });
  const [now] = useState(() => Date.now());
  const parties = q.data ?? [];
  // Active parties first (by date); expired or cancelled ones sink below them.
  const dead = (p: Party) => p.status === "EXPIRED" || p.status === "CANCELLED";
  const upcoming = parties.filter((p) => new Date(p.ends_at).getTime() >= now).sort((a, b) => Number(dead(a)) - Number(dead(b)) || a.starts_at.localeCompare(b.starts_at));
  const past = parties.filter((p) => new Date(p.ends_at).getTime() < now);
  const pick = (p: Party) => { setToken(p.token); router.replace("/cliente"); };

  return (
    <View style={{ flex: 1, backgroundColor: party.ink }}>
      <StatusBar style="light" />
      <PartyBackdrop density={0.5} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 36 }}>
          <KomyxLogo size={34} tagline={null} />
          {token ? <Pressable onPress={() => router.back()} hitSlop={10}><Text style={{ color: "#cfd2e6", fontWeight: "700" }}>Cancelar</Text></Pressable> : null}
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 12, paddingBottom: 40 }}>
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "900", lineHeight: 34, letterSpacing: -0.6, marginTop: 8 }}>Qual festa você quer acompanhar?</Text>
          <Text style={{ color: "#cfd2e6", fontSize: 15, lineHeight: 22, marginBottom: 8 }}>Dá para trocar depois, em Início.</Text>
          {q.isLoading ? <Loading /> : null}
          {upcoming[0] && !dead(upcoming[0]) ? <PartyCard p={upcoming[0]} hero onDark selected={upcoming[0].token === token} onPress={() => pick(upcoming[0])} /> : null}
          {(upcoming[0] && !dead(upcoming[0]) ? upcoming.slice(1) : upcoming).map((p) => <PartyCard key={p.id} p={p} onDark selected={p.token === token} onPress={() => pick(p)} />)}
          {past.length ? <Text style={{ color: party.sun, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginTop: 10 }}>Festas passadas</Text> : null}
          {past.map((p) => <PartyCard key={p.id} p={p} onDark selected={p.token === token} onPress={() => pick(p)} />)}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
