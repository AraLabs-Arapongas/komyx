import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useState } from "react";
import { Pressable, View, type TextInput, type TextInputProps } from "react-native";
import { Input } from "./components";
import { colors } from "./theme";

/** Password field with an eye button to show or hide what was typed (same as the web PasswordInput). */
export function PasswordInput({ ref, style, ...props }: Omit<TextInputProps, "secureTextEntry"> & { ref?: React.Ref<TextInput> }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ justifyContent: "center" }}>
      <Input ref={ref} autoCapitalize="none" autoCorrect={false} {...props} secureTextEntry={!visible} style={[{ paddingRight: 48 }, style]} />
      <Pressable onPress={() => setVisible((v) => !v)} hitSlop={6} accessibilityRole="button" accessibilityLabel={visible ? "Ocultar senha" : "Mostrar senha"} accessibilityState={{ selected: visible }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}
