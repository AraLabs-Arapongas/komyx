import { Text, View, type ViewStyle } from "react-native";
import Svg, { Defs, G, Mask, Path, Rect } from "react-native-svg";

/** Komyx mark: balloon with the K knocked out, knot and string. Same geometry as the web SVG. */
export function KomyxMark({ size = 48, color = "#ffc43d", style }: { size?: number; color?: string; style?: ViewStyle }) {
  const w = size * (190 / 200);
  return (
    <View style={[{ width: w, height: size }, style]}>
      <Svg width={w} height={size} viewBox="0 0 190 200">
        <Defs>
          <Mask id="komyx-k">
            <Rect width="190" height="200" fill="#fff" />
            <G fill="none" stroke="#000" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M68 50 V128" />
              <Path d="M80 94 L122 128" />
              <Path d="M80 94 L118 54" />
            </G>
          </Mask>
        </Defs>
        <G fill={color}>
          <Path mask="url(#komyx-k)" d="M95 8 C 142 8 174 44 174 90 C 174 130 142 158 95 164 C 48 158 16 130 16 90 C 16 44 48 8 95 8 Z" />
          <Path d="M86 164 L95 178 L104 164 Z" />
          <Path fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" d="M95 178 C 97 186 88 190 94 198" />
        </G>
      </Svg>
    </View>
  );
}

/** Mark + "Komyx" + tagline, horizontal or stacked. */
export function KomyxLogo({ size = 44, color = "#fff", markColor = "#ffc43d", tagline = "Gestão para buffets", stacked = false }: { size?: number; color?: string; markColor?: string; tagline?: string | null; stacked?: boolean }) {
  return (
    <View style={{ flexDirection: stacked ? "column" : "row", alignItems: "center", gap: stacked ? 10 : 12 }}>
      <KomyxMark size={size} color={markColor} />
      <View style={{ alignItems: stacked ? "center" : "flex-start" }}>
        <Text style={{ color, fontWeight: "900", fontSize: size * 0.62, letterSpacing: -0.5, lineHeight: size * 0.7 }}>Komyx</Text>
        {tagline ? <Text style={{ color, opacity: 0.75, fontWeight: "600", fontSize: Math.max(11, size * 0.28) }}>{tagline}</Text> : null}
      </View>
    </View>
  );
}
