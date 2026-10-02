import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { verifyKioskPin } from "@/lib/kiosk";
import { Button, Muted, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

/** Asks for the kiosk PIN; calls onSuccess only when it matches the one saved on the device. */
export function PinModal({ visible, title, onSuccess, onClose }: { visible: boolean; title: string; onSuccess: () => void; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) { setPin(""); setError(null); setTimeout(() => ref.current?.focus(), 150); }
  }, [visible]);

  async function submit(value: string) {
    if (await verifyKioskPin(value)) { onSuccess(); return; }
    setError("PIN incorreto."); setPin("");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(28,25,23,0.55)", justifyContent: "center", padding: 24 }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 12, alignSelf: "center", width: "100%", maxWidth: 360 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Muted>Digite o PIN do quiosque (4 a 6 números).</Muted>
          <TextInput
            ref={ref}
            value={pin}
            onChangeText={(v) => { const d = v.replace(/\D/g, "").slice(0, 6); setPin(d); setError(null); if (d.length === 6) submit(d); }}
            onSubmitEditing={() => pin.length >= 4 && submit(pin)}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={{ borderWidth: 1, borderColor: error ? colors.red : colors.border, borderRadius: 12, paddingVertical: 12, textAlign: "center", fontSize: 24, letterSpacing: 8, color: colors.foreground }}
          />
          {error ? <Text style={{ color: colors.red, fontSize: 13 }}>{error}</Text> : null}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Cancelar" variant="outline" onPress={onClose} style={{ flex: 1 }} />
            <Button title="Confirmar" onPress={() => submit(pin)} disabled={pin.length < 4} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
