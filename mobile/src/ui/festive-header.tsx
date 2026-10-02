import { type ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Bunting, party } from "./party";

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
 * Ink banner with bunting and two balloons: the top of Início, Minhas festas and Menu. Static (no
 * animation) so it is cheap on long-lived screens.
 */
export function FestiveHeader({ eyebrow, title, subtitle, right, children, compact }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode; children?: ReactNode; compact?: boolean }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ backgroundColor: party.ink, overflow: "hidden", paddingHorizontal: 16, paddingTop: compact ? 44 : 50, paddingBottom: compact ? 18 : 22, marginHorizontal: -16, marginTop: -16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
      <Bunting width={width} y={0} flags={9} size={0.9} />
      <Balloon color={party.berry} size={74} style={{ right: 14, top: 34, transform: [{ rotate: "6deg" }], opacity: 0.95 }} />
      <Balloon color={party.sky} size={52} style={{ right: 58, top: 56, transform: [{ rotate: "-8deg" }], opacity: 0.9 }} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, paddingRight: 70 }}>
          {eyebrow ? <Text style={{ color: party.sun, fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" }}>{eyebrow}</Text> : null}
          <Text style={{ color: "#fff", fontSize: compact ? 22 : 26, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 }} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={{ color: "#cfd2e6", fontSize: 13, fontWeight: "600", marginTop: 2 }} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}
