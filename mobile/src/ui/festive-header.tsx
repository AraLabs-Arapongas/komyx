import { type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Bunting, PartyBackdrop, party } from "./party";

function Balloon({ color, size, style }: { color: string; size: number; style: object }) {
  return (
    <View style={[{ position: "absolute" }, style]} pointerEvents="none">
      <Svg width={size * 0.6} height={size} viewBox="0 0 60 140">
        <Path d="M30 86 C 29 100, 34 108, 28 124 C 24 132, 32 136, 30 140" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} />
        <Path d="M30 6 C 46 6 56 20 56 40 C 56 58 44 72 30 76 C 16 72 4 58 4 40 C 4 20 14 6 30 6 Z" fill={color} />
        <Path d="M20 16 C 14 22 12 30 14 38" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M26 74 L30 82 L34 74 Z" fill={color} />
      </Svg>
    </View>
  );
}

/**
 * Ink banner with bunting and balloons at the top of Início, Minhas festas and Menu. Sits under
 * the status bar (safe-area aware). `animated` adds floating balloons and confetti rain.
 */
export function FestiveHeader({ eyebrow, title, subtitle, right, children, compact, animated, bleed = true, onBack, backIcon = "arrow-back", topInset }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode; children?: ReactNode; compact?: boolean; animated?: boolean; /** Pull over the Screen's 16px padding (default). Off when rendered by the navigator. */ bleed?: boolean; onBack?: () => void; backIcon?: "arrow-back" | "close"; /** Overrides the safe-area top (modals sit below the status bar). */ topInset?: number }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = topInset ?? insets.top;
  const height = top + (compact ? 96 : 132);
  return (
    <View style={{ backgroundColor: party.ink, overflow: "hidden", marginHorizontal: bleed ? -16 : 0, marginTop: bleed ? -16 : 0, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, minHeight: height }}>
      {animated ? <View style={StyleSheet.absoluteFill}><PartyBackdrop density={0.35} bunting={false} height={height} /></View> : null}
      <Bunting width={width} y={top - 2} flags={9} size={0.9} />
      <Balloon color={party.berry} size={74} style={{ right: 14, top: top + 26, transform: [{ rotate: "6deg" }], opacity: 0.95 }} />
      <Balloon color={party.sky} size={52} style={{ right: 58, top: top + 48, transform: [{ rotate: "-8deg" }], opacity: 0.9 }} />
      <View style={{ paddingTop: top + 38, paddingHorizontal: 16, paddingBottom: compact ? 18 : 22, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Voltar" style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", marginBottom: 2, opacity: pressed ? 0.7 : 1 })}>
            <Ionicons name={backIcon} size={22} color="#fff" />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, paddingRight: 70 }}>
          {eyebrow ? <Text style={{ color: party.sun, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{eyebrow}</Text> : null}
          <Text style={{ color: "#fff", fontSize: compact ? 22 : 28, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 }} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={{ color: "#cfd2e6", fontSize: 13, fontWeight: "600", marginTop: 2 }} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** Faint confetti sprinkled over a cream background (static), for screens that would otherwise be plain. */
export function Sprinkles({ height = 420 }: { height?: number }) {
  const { width } = useWindowDimensions();
  const COLORS = [party.berry, party.sun, party.sky, party.mint, party.orange];
  const pieces = Array.from({ length: 22 }, (_, i) => ({ x: ((i * 41 + 7) % 100) / 100 * width, y: ((i * 67 + 13) % 100) / 100 * height, s: 4 + (i % 3) * 2, c: COLORS[i % 5], r: (i * 37) % 180, round: i % 3 === 0 }));
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height }}>
      {pieces.map((p, i) => <View key={i} style={{ position: "absolute", left: p.x, top: p.y, width: p.round ? p.s : p.s * 0.5, height: p.round ? p.s : p.s * 1.6, borderRadius: p.round ? 99 : 1, backgroundColor: p.c, opacity: 0.35, transform: [{ rotate: `${p.r}deg` }] }} />)}
    </View>
  );
}
