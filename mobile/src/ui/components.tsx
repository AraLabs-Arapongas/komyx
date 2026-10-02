import type React from "react";
import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, shadow, space, tones } from "./theme";

/** `safeTop` pads the status bar / notch too: use it on screens without a native header. */
export function Screen({ children, refreshing, onRefresh, padded = true, scroll = true, safeTop = false }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; padded?: boolean; scroll?: boolean; safeTop?: boolean }) {
  const content = scroll ? (
    <ScrollView contentContainerStyle={[padded && styles.padded, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.brand} /> : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && styles.padded]}>{children}</View>
  );
  return <SafeAreaView edges={safeTop ? ["top", "bottom"] : ["bottom"]} style={styles.screen}>{content}</SafeAreaView>;
}

export function Card({ children, style, tone }: { children: ReactNode; style?: ViewStyle; tone?: "amber" | "brand" }) {
  return <View style={[styles.card, tone === "amber" && { borderColor: "#fde68a", backgroundColor: "#fffbeb" }, tone === "brand" && { borderColor: "#f9c2d3", backgroundColor: colors.brandSoft }, style]}>{children}</View>;
}

export function CardTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.cardTitleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Badge({ tone = "zinc", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const t = tones[tone];
  return <View style={[styles.badge, { backgroundColor: t.bg }]}><Text style={[styles.badgeText, { color: t.fg }]}>{children}</Text></View>;
}

export function Button({ title, variant = "primary", size = "md", loading, icon, style, ...props }: PressableProps & { title: string; variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success"; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode; style?: ViewStyle }) {
  const v = {
    primary: { bg: colors.brand, fg: colors.brandFg, border: colors.brand },
    secondary: { bg: colors.brandSoft, fg: colors.brandDeep, border: colors.brandSoft },
    outline: { bg: colors.surface, fg: colors.foreground, border: colors.border },
    ghost: { bg: "transparent", fg: colors.muted, border: "transparent" },
    danger: { bg: "transparent", fg: colors.red, border: "transparent" },
    success: { bg: colors.mint, fg: colors.ink, border: colors.mint },
  }[variant];
  const h = { sm: 36, md: 44, lg: 52 }[size];
  return (
    <Pressable {...props} disabled={props.disabled || loading}
      style={({ pressed }) => [styles.button, { backgroundColor: v.bg, borderColor: v.border, height: h, opacity: pressed || props.disabled ? 0.7 : 1 }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: v.fg, fontSize: size === "sm" ? 13 : 15 }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={{ color: colors.red, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export function Input({ ref, ...props }: TextInputProps & { ref?: React.Ref<TextInput> }) {
  return <TextInput ref={ref} placeholderTextColor="#a8a29e" {...props} style={[styles.input, props.style]} />;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space.sm }} />;
}

export function Loading() {
  return <View style={{ padding: 40, alignItems: "center" }}><ActivityIndicator color={colors.brand} /></View>;
}

export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontWeight: "600", color: colors.foreground }}>{title}</Text>
      {description ? <Muted style={{ textAlign: "center", marginTop: 4 }}>{description}</Muted> : null}
    </View>
  );
}

export function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, strong && { fontSize: 18 }]}>{value}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  padded: { padding: space.lg, gap: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.lg, gap: space.sm, ...shadow },
  cardTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  cardTitle: { fontSize: 17, fontWeight: "800", color: colors.foreground },
  cardSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 16 },
  buttonText: { fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  input: { height: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, backgroundColor: colors.surface, fontSize: 16, color: colors.foreground },
  muted: { color: colors.muted, fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  empty: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.lg, padding: 24, alignItems: "center" },
  statLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: colors.muted },
  statValue: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  title: { fontSize: 24, fontWeight: "900", color: colors.foreground, letterSpacing: -0.4 },
  h3: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  text: { fontSize: 15, color: colors.foreground },
});
