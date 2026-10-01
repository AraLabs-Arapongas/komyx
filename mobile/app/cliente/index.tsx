import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { normalizePhone } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { Button, Card, CardTitle, Field, Input, Muted, Screen, styles } from "@/ui/components";

function toIsoDate(input: string) {
  const m = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) return input.trim();
  return null;
}

function extractToken(input: string) {
  const m = input.trim().match(/(?:\/(r|g)\/)?([0-9a-f]{48})/i);
  return m ? { kind: (m[1] ?? "r") as "r" | "g", token: m[2] } : null;
}

export default function ClienteIndex() {
  const [whatsapp, setWhatsapp] = useState("");
  const [date, setDate] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function find() {
    setError(null);
    const iso = toIsoDate(date);
    const digits = normalizePhone(whatsapp);
    if (digits.length < 10 || !iso) { setError("Informe o WhatsApp com DDD e a data no formato dd/mm/aaaa."); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("find_reservation", { p_whatsapp: digits, p_date: iso });
    setBusy(false);
    if (error || !data) { setError("Não achamos reserva com esse WhatsApp nessa data. Confira os dados ou fale com o buffet."); return; }
    router.push({ pathname: "/cliente/reserva/[token]", params: { token: data as string } });
  }

  function openCode() {
    const t = extractToken(code);
    if (!t) { setError("Cole o link completo ou o código da reserva/convite."); return; }
    router.push(t.kind === "g" ? { pathname: "/cliente/convite/[token]", params: { token: t.token } } : { pathname: "/cliente/reserva/[token]", params: { token: t.token } });
  }

  return (
    <Screen>
      <Text style={styles.title}>Minha reserva</Text>
      <Muted>Veja o Pix do sinal, o orçamento, as parcelas e o contrato da sua festa.</Muted>
      <Card>
        <CardTitle title="Buscar pela festa" subtitle="O WhatsApp usado na reserva e a data da festa" />
        <Field label="WhatsApp"><Input value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder="(11) 99999-0000" /></Field>
        <Field label="Data da festa"><Input value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" placeholder="dd/mm/aaaa" /></Field>
        <Button title="Encontrar minha reserva" onPress={find} loading={busy} />
      </Card>
      <Card>
        <CardTitle title="Tenho um link ou código" subtitle="Reserva (…/r/…) ou convite (…/g/…)" />
        <Input value={code} onChangeText={setCode} autoCapitalize="none" placeholder="Cole aqui" />
        <Button title="Abrir" variant="outline" onPress={openCode} />
      </Card>
      {error ? <Text style={{ color: "#dc2626" }}>{error}</Text> : null}
    </Screen>
  );
}
