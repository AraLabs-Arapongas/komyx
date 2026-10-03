import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Modal, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "./theme";

/**
 * Bottom sheet: the dim backdrop fades in place while only the sheet slides up. (A Modal with
 * animationType="slide" would slide the backdrop along with the content.)
 */
export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { height } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [y] = useState(() => new Animated.Value(height));
  const [dim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount follows the prop so the exit animation can finish before unmounting
      setMounted(true);
      Animated.parallel([
        Animated.timing(dim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(dim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(y, { toValue: height, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, mounted, height, y, dim]);

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(27,31,58,0.5)", opacity: dim }}>
        <Pressable onPress={onClose} style={{ flex: 1 }} accessibilityLabel="Fechar" />
      </Animated.View>
      <Animated.View style={{ position: "absolute", left: 0, right: 0, bottom: 0, transform: [{ translateY: y }], backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 20 + bottom, gap: 12, maxHeight: height * 0.85 }}>
        {children}
      </Animated.View>
    </Modal>
  );
}
