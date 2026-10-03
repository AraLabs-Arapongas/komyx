import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black, useFonts } from "@expo-google-fonts/nunito";
import React from "react";
import { Platform, Text, type TextStyle } from "react-native";
import { fonts } from "./theme";

export function useAppFonts() {
  const [loaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  return loaded;
}

/** Maps a fontWeight to the matching Nunito face (RN does not synthesize weights for custom fonts). */
export function faceFor(weight: TextStyle["fontWeight"]) {
  const w = typeof weight === "number" ? weight : weight === "bold" ? 700 : weight ? Number(weight) : 400;
  if (Number.isNaN(w) || w < 600) return fonts.regular;
  if (w < 700) return fonts.semibold;
  if (w < 800) return fonts.bold;
  if (w < 900) return fonts.extrabold;
  return fonts.black;
}

let patched = false;
/**
 * Makes every <Text> use Nunito without touching each screen: the weight each
 * style asks for picks the face. Called once after the fonts load.
 */
export function applyAppFont() {
  if (patched) return;
  patched = true;
  if (Platform.OS === "web") {
    // react-native-web renders DOM nodes; a global stylesheet is the right tool there.
    if (typeof document !== "undefined" && !document.getElementById("komyx-font")) {
      const el = document.createElement("style");
      el.id = "komyx-font";
      el.textContent = `body, input, textarea, button { font-family: ${fonts.semibold}, ${fonts.regular}, system-ui, sans-serif; } [style*="font-weight: 700"], [style*="font-weight:700"] { font-family: ${fonts.bold} !important; } [style*="font-weight: 800"], [style*="font-weight:800"] { font-family: ${fonts.extrabold} !important; } [style*="font-weight: 900"], [style*="font-weight:900"] { font-family: ${fonts.black} !important; }`;
      document.head.appendChild(el);
    }
    return;
  }
  type Styled = React.ReactElement<{ style?: unknown }>;
  // Text only: TextInput gets its face from styles.input (patching it broke iOS placeholders).
  for (const Comp of [Text] as unknown as { render?: (...args: unknown[]) => Styled }[]) {
    const original = Comp.render;
    if (typeof original !== "function") continue;
    Comp.render = function (this: unknown, ...args: unknown[]) {
      const element = original.apply(this, args) as Styled | null;
      if (!element) return element as unknown as Styled;
      const flat = flatten(element.props.style);
      const family = flat.fontFamily && flat.fontFamily.startsWith("Nunito") ? flat.fontFamily : flat.fontFamily && /mono|courier/i.test(flat.fontFamily) ? flat.fontFamily : faceFor(flat.fontWeight);
      return React.cloneElement(element, { style: [element.props.style, { fontFamily: family, fontWeight: undefined }] });
    };
  }
}

function flatten(style: unknown): TextStyle {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return typeof style === "object" ? (style as TextStyle) : {};
}
