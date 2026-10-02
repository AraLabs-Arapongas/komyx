import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { KomyxMark } from "./brand";
import { PartyBackdrop, party } from "./party";

/**
 * Festive splash shown right after the native one: ink sky, bunting, balloons, the mark bouncing
 * in and the tagline. Calls `onDone` after the fade-out; `ready` holds it until the app loaded.
 */
export function AnimatedSplash({ ready, onDone, minMs = 1600 }: { ready: boolean; onDone: () => void; minMs?: number }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(18)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const startedAt = useRef(Date.now());

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    ]).start();
  }, [scale, logoOpacity, textY, textOpacity]);

  useEffect(() => {
    if (!ready) return;
    const wait = Math.max(0, minMs - (Date.now() - startedAt.current));
    const id = setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone()), wait);
    return () => clearTimeout(id);
  }, [ready, minMs, fade, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade, zIndex: 50, alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
      <PartyBackdrop density={1} />
      <Animated.View style={{ alignItems: "center", transform: [{ scale }], opacity: logoOpacity }}>
        <KomyxMark size={132} color={party.sun} />
      </Animated.View>
      <Animated.View style={{ alignItems: "center", marginTop: 18, transform: [{ translateY: textY }], opacity: textOpacity }}>
        <Text style={{ color: "#fff", fontSize: 40, fontWeight: "900", letterSpacing: -1 }}>Komyx</Text>
        <Text style={{ color: "#cfd2e6", fontSize: 15, fontWeight: "600", marginTop: 2 }}>Gestão para buffets</Text>
      </Animated.View>
    </Animated.View>
  );
}
