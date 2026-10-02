import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { setOnboardingSeen } from "@/lib/prefs";
import { KomyxLogo } from "@/ui/brand";
import { PartyBackdrop, party } from "@/ui/party";

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; text: string }[] = [
  { icon: "calculator-outline", color: party.sun, title: "A festa se vende sozinha.", text: "O cliente monta o orçamento na sua página: pacote, tema, data livre e quantas pessoas. Chega pronto para virar evento." },
  { icon: "qr-code-outline", color: party.mint, title: "Pix, contrato e convite, automáticos.", text: "Sinal por Pix com identificador no extrato, contrato preenchido e aceito pelo link, convite com confirmação dos convidados." },
  { icon: "tablet-landscape-outline", color: party.berry, title: "No dia da festa, todo mundo no celular.", text: "Quem está na porta marca quem chegou e fecha a conta com Pix. O cliente acompanha reserva, contrato e convite pelo celular dele." },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);
  const ref = useRef<ScrollView>(null);
  const last = i === SLIDES.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setI(Math.round(e.nativeEvent.contentOffset.x / width));
  }
  async function finish(modo?: "buffet" | "cliente") {
    await setOnboardingSeen(true);
    router.replace(modo ? { pathname: "/entrar", params: { modo } } : "/entrar");
  }

  return (
    <View style={{ flex: 1, backgroundColor: party.ink }}>
      <StatusBar style="light" />
      <PartyBackdrop density={0.6} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 36 }}>
          <KomyxLogo size={34} tagline={null} />
          {!last ? <Pressable onPress={() => finish()} hitSlop={10}><Text style={{ color: "#cfd2e6", fontWeight: "700" }}>Pular</Text></Pressable> : null}
        </View>
        <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScroll} onScroll={onScroll} scrollEventThrottle={64} style={{ flex: 1 }}>
          {SLIDES.map((s) => (
            <View key={s.title} style={{ width, paddingHorizontal: 28, justifyContent: "center", gap: 18 }}>
              <View style={{ width: 92, height: 92, borderRadius: 28, backgroundColor: s.color, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } }}>
                <Ionicons name={s.icon} size={46} color={party.ink} />
              </View>
              <Text style={{ color: "#fff", fontSize: 34, fontWeight: "900", lineHeight: 38, letterSpacing: -0.8 }}>{s.title}</Text>
              <Text style={{ color: "#cfd2e6", fontSize: 17, lineHeight: 26 }}>{s.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={{ padding: 24, gap: 18 }}>
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
            {SLIDES.map((_, k) => <View key={k} style={{ height: 8, width: k === i ? 28 : 8, borderRadius: 999, backgroundColor: k === i ? party.sun : "rgba(255,255,255,0.35)" }} />)}
          </View>
          {last ? (
            <View style={{ gap: 10 }}>
              <Pressable onPress={() => finish("buffet")} style={({ pressed }) => ({ height: 56, borderRadius: 999, backgroundColor: party.berry, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Entrar no meu buffet</Text>
              </Pressable>
              <Pressable onPress={() => finish("cliente")} style={({ pressed }) => ({ height: 56, borderRadius: 999, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Sou cliente, tenho uma festa</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => ref.current?.scrollTo({ x: (i + 1) * width, animated: true })} style={({ pressed }) => ({ height: 56, borderRadius: 999, backgroundColor: party.berry, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Próximo</Text>
            </Pressable>
          )}
          <Text style={{ color: "#9da1bd", fontSize: 12, textAlign: "center" }}>{last ? "Buffet: e-mail e senha · Cliente: o celular da reserva, com código por SMS" : "1 mês grátis para buffets · clientes entram com o celular da reserva"}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
