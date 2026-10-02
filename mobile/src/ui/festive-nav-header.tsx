import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bunting, party } from "./party";

/** The subset of react-navigation's header props we read (native-stack and bottom-tabs agree on it). */
type Props = {
  route: { name: string };
  navigation: { goBack: () => void };
  back?: { title?: string } | undefined;
  options: { title?: string; headerTitle?: unknown; presentation?: string; headerRight?: (p: { tintColor?: string; canGoBack: boolean }) => ReactNode };
};

/**
 * The app's navigation header: ink bar with bunting, white title, berry back arrow. Used by every
 * Stack and Tabs screen that does not draw its own FestiveHeader, so the party identity follows
 * the owner (and the client) into inner screens.
 */
export function FestiveNavHeader(props: Props) {
  const { width } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const back = "back" in props ? props.back : undefined;
  const modal = props.options.presentation === "modal";
  const inset = modal ? 0 : top;
  const title = typeof props.options.headerTitle === "string" ? props.options.headerTitle : props.options.title ?? props.route.name;
  const right = props.options.headerRight?.({ tintColor: "#fff", canGoBack: Boolean(back) });
  return (
    <View style={{ backgroundColor: party.ink, paddingTop: inset, overflow: "hidden", borderBottomLeftRadius: 22, borderBottomRightRadius: 22 }}>
      <Bunting width={width} y={inset - 4} flags={9} size={0.75} />
      <View style={{ height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, marginTop: 10 }}>
        <View style={{ width: 44, alignItems: "flex-start" }}>
          {back ? (
            <Pressable onPress={props.navigation.goBack} hitSlop={10} accessibilityLabel="Voltar" style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name={modal ? "close" : "arrow-back"} size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", color: "#fff", fontSize: 18, fontWeight: "900", letterSpacing: -0.3 }}>{title}</Text>
        <View style={{ width: 44, alignItems: "flex-end" }}>{right}</View>
      </View>
    </View>
  );
}
