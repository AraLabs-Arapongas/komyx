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
  { icon: "balloon-outline", color: party.sun, title: "Sua festa, no seu bolso.", text: "Veja a reserva, a data, o que já pagou e o que falta. O Pix do buffet com o valor certo, sem pedir no WhatsApp." },
  { icon: "people-outline", color: party.mint, title: "Convidados sem grupo de WhatsApp.", text: "Mande o link do convite, veja quem confirmou, quantos ainda cabem no pacote e personalize o convite com foto e mensagem." },
  { icon: "chatbubble-ellipses-outline", color: party.berry, title: "Peça ao buffet pelo app.", text: "Bolo extra, mais convidados, um aviso de pagamento: você pede aqui e o buffet confirma. Tudo registrado na sua festa." },
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
          <KomyxLogo size={34} tagline="Sua festa, organizada" />
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
        <View style={{ padding: 24, gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
            {SLIDES.map((_, k) => <View key={k} style={{ height: 8, width: k === i ? 28 : 8, borderRadius: 999, backgroundColor: k === i ? party.sun : "rgba(255,255,255,0.35)" }} />)}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {i > 0 ? (
              <Pressable onPress={() => ref.current?.scrollTo({ x: (i - 1) * width, animated: true })} hitSlop={8} accessibilityLabel="Voltar" style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </Pressable>
            ) : null}
            {last ? (
              <Pressable onPress={() => finish("cliente")} style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 999, backgroundColor: party.berry, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Ver minha festa</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => ref.current?.scrollTo({ x: (i + 1) * width, animated: true })} style={({ pressed }) => ({ flex: 1, height: 56, borderRadius: 999, backgroundColor: party.berry, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.85 : 1 })}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Próximo</Text>
              </Pressable>
            )}
          </View>
          {last ? (
            <Pressable onPress={() => finish("buffet")} hitSlop={8} style={{ alignItems: "center", marginTop: -8 }}>
              <Text style={{ color: "#cfd2e6", fontWeight: "700", fontSize: 14 }}>Entrar com e-mail e senha</Text>
            </Pressable>
          ) : null}
          {!last ? <Text style={{ color: "#9da1bd", fontSize: 12, textAlign: "center" }}>Acompanhe sua festa pelo celular, do sinal ao parabéns.</Text> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
