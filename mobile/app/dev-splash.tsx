import { router } from "expo-router";
import { View } from "react-native";
import { AnimatedSplash } from "@/ui/animated-splash";
import { party } from "@/ui/party";

/** Full-screen preview of the animated splash (from Dev tools). */
export default function DevSplash() {
  return (
    <View style={{ flex: 1, backgroundColor: party.ink }}>
      <AnimatedSplash ready minMs={3200} onDone={() => router.back()} />
    </View>
  );
}
