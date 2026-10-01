import { Link } from "expo-router";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Muted, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export default function Welcome() {
  return (
    <SafeAreaView style={[styles.screen, { padding: 24, justifyContent: "space-between" }]}>
      <View style={{ marginTop: 60, gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 26 }}>F</Text>
        </View>
        <Text style={[styles.title, { fontSize: 30 }]}>Festeja</Text>
        <Text style={[styles.text, { fontSize: 17 }]}>Agenda, orçamento, contrato e convite do seu buffet, no bolso.</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Link href="/login" asChild><Button title="Sou do buffet" size="lg" /></Link>
        <Link href="/cliente" asChild><Button title="Sou cliente · minha reserva" variant="outline" size="lg" /></Link>
        <Muted style={{ textAlign: "center" }}>Clientes não precisam de conta: basta o WhatsApp e a data da festa.</Muted>
      </View>
    </SafeAreaView>
  );
}
