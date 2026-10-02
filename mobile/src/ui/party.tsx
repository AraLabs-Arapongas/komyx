import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

/** Festive palette shared with the web landing. */
export const party = { ink: "#1b1f3a", paper: "#fffdf7", paper2: "#fff4e3", berry: "#e8356d", sun: "#ffc43d", mint: "#2ec4a6", sky: "#4cb5f5", orange: "#ff8a3d" };
const COLORS = [party.berry, party.sun, party.sky, party.mint, party.orange];

/** String of triangular flags across the top, drooping in the middle like on the buffet pages. */
export function Bunting({ width, y = 0, flags = 9, size = 1 }: { width: number; y?: number; flags?: number; size?: number }) {
  const h = 46 * size;
  const step = width / flags;
  const flagW = step * 0.62;
  const flagH = 22 * size;
  const sag = 14 * size;
  const curveY = (x: number) => 6 * size + Math.sin((x / width) * Math.PI) * sag;
  return (
    <Svg width={width} height={h} style={{ position: "absolute", top: y, left: 0 }}>
      <Path d={`M0 ${6 * size} Q ${width / 2} ${6 * size + sag * 2} ${width} ${6 * size}`} stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} fill="none" />
      {Array.from({ length: flags }, (_, i) => {
        const x = i * step + (step - flagW) / 2;
        const top = curveY(x + flagW / 2);
        return <Path key={i} d={`M${x} ${top} L${x + flagW} ${top} L${x + flagW / 2} ${top + flagH} Z`} fill={COLORS[i % COLORS.length]} />;
      })}
    </Svg>
  );
}

function BalloonShape({ color, size }: { color: string; size: number }) {
  const w = size * 0.6;
  return (
    <Svg width={w} height={size} viewBox="0 0 60 140">
      <Path d="M30 86 C 29 100, 34 108, 28 124 C 24 132, 32 136, 30 140" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      <Path d="M30 6 C 46 6 56 20 56 40 C 56 58 44 72 30 76 C 16 72 4 58 4 40 C 4 20 14 6 30 6 Z" fill={color} />
      <Path d="M20 16 C 14 22 12 30 14 38" stroke="rgba(255,255,255,0.35)" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M26 74 L30 82 L34 74 Z" fill={color} />
    </Svg>
  );
}

/** A balloon that floats up and sways, looping forever. */
function FloatingBalloon({ color, size, left, delay, duration, height }: { color: string; size: number; left: number; delay: number; duration: number; height: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [height + size, -size * 1.4] });
  const translateX = t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 10, -6, 8, 0] });
  const rotate = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["-4deg", "4deg", "-3deg"] });
  const opacity = t.interpolate({ inputRange: [0, 0.08, 0.9, 1], outputRange: [0, 0.95, 0.95, 0] });
  return (
    <Animated.View style={{ position: "absolute", left, top: 0, transform: [{ translateY }, { translateX }, { rotate }], opacity }}>
      <BalloonShape color={color} size={size} />
    </Animated.View>
  );
}

/** A confetti piece falling and spinning, looping forever. */
function Confetti({ color, size, left, delay, duration, height, round }: { color: string; size: number; left: number; delay: number; duration: number; height: number; round: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }), Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "540deg"] });
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -8] });
  return <Animated.View style={{ position: "absolute", left, top: 0, width: round ? size : size * 0.55, height: round ? size : size * 1.6, borderRadius: round ? 999 : 2, backgroundColor: color, opacity: 0.9, transform: [{ translateY }, { translateX }, { rotate }] }} />;
}

/**
 * Ink background with bunting, floating balloons and confetti rain. Absolute-fill: put content on
 * top. `density` scales how many pieces animate (keep it low on long-lived screens).
 */
export function PartyBackdrop({ density = 1, bunting = true, height: fixedHeight }: { density?: number; bunting?: boolean; height?: number }) {
  const { width, height: winH } = useWindowDimensions();
  const height = fixedHeight ?? winH;
  const pieces = useMemo(() => Array.from({ length: Math.round(14 * density) }, (_, i) => ({ left: ((i * 37 + 11) % 100) / 100 * width, size: 6 + ((i * 7) % 6), delay: (i * 530) % 6000, duration: 9000 + ((i * 1300) % 5000), color: COLORS[i % COLORS.length], round: i % 3 === 1 })), [density, width]);
  const balloons = useMemo(() => [
    { color: party.berry, size: 120, left: width * 0.04, delay: 0, duration: 14000 },
    { color: party.sky, size: 90, left: width * 0.82, delay: 3000, duration: 16000 },
    { color: party.sun, size: 70, left: width * 0.18, delay: 7000, duration: 15000 },
    { color: party.mint, size: 80, left: width * 0.68, delay: 10000, duration: 17000 },
  ].slice(0, Math.max(2, Math.round(4 * density))), [width, density]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: party.ink, overflow: "hidden" }]}>
      {pieces.map((p, i) => <Confetti key={i} {...p} height={height} />)}
      {balloons.map((b, i) => <FloatingBalloon key={i} {...b} height={height} />)}
      {bunting ? <Bunting width={width} y={0} /> : null}
    </View>
  );
}
