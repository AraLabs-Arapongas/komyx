import { Ionicons } from "@expo/vector-icons";
import type { UseMutationResult } from "@tanstack/react-query";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import type { Addon } from "@/lib/client";
import { formatCurrency, formatDateLong } from "@/lib/format";
import type { AskInput, ReservationView } from "@/lib/reservation-view";
import { Button, Field, Input, Muted, Row, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

export type AskKind = "menu" | "extra" | "people" | "other";

/** Bottom sheet where the party owner asks the buffet for something (extra, people, other). */
export function AskSheet({ view, ask, sheet, onChange }: { view: ReservationView; ask: UseMutationResult<string, Error, AskInput>; sheet: AskKind | null; onChange: (s: AskKind | null) => void }) {
  const [freeText, setFreeText] = useState("");
  const [peopleAdults, setPeopleAdults] = useState("");
  const [peopleChildren, setPeopleChildren] = useState("");
  const { r, ev, org, showPrices, first } = view;
  const close = () => { onChange(null); setFreeText(""); };
  const send = (v: AskInput) => ask.mutate(v, { onSuccess: close });
  return (
    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(28,25,23,0.45)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, maxHeight: "80%" }}>
          {sheet === "menu" ? (
            <>
              <Text style={styles.cardTitle}>O que você quer pedir?</Text>
              {([["extra", "cube-outline", "Um extra (bolo, hora extra, recreação…)"], ["people", "people-outline", "Mudar o número de pessoas"], ["other", "chatbubble-ellipses-outline", "Outra coisa"]] as const).map(([k, icon, label]) => (
                <Pressable key={k} onPress={() => onChange(k)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <Ionicons name={icon} size={22} color={colors.brand} /><Text style={[styles.text, { flex: 1 }]}>{label}</Text><Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
              {org.whatsapp ? <Button title="Prefiro falar no WhatsApp" variant="ghost" size="sm" onPress={() => { close(); view.wa(`Olá! Sobre minha festa de ${formatDateLong(ev.starts_at)}: `); }} /> : null}
            </>
          ) : null}
          {sheet === "extra" ? (
            <>
              <Text style={styles.cardTitle}>Pedir um extra</Text>
              <Muted>O buffet confirma e o valor entra na sua conta da festa.</Muted>
              {r.addons.map((a: Addon) => (
                <Pressable key={a.id} onPress={() => send({ kind: "EXTRA", message: `${first} pediu ${a.name}.`, payload: { addon_id: a.id, description: a.name, price: a.price } })} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flex: 1 }}><Text style={styles.text}>{a.name}</Text>{a.description ? <Muted>{a.description}</Muted> : null}</View>
                  {showPrices ? <Text style={{ fontWeight: "700" }}>{formatCurrency(a.price)}</Text> : null}
                </Pressable>
              ))}
              <Field label="Ou descreva o que quer"><Input value={freeText} onChangeText={setFreeText} placeholder="Ex.: bolo cenográfico de unicórnio" /></Field>
              <Button title="Enviar pedido" loading={ask.isPending} disabled={freeText.trim().length < 3} onPress={() => send({ kind: "EXTRA", message: freeText.trim(), payload: { description: freeText.trim() } })} />
            </>
          ) : null}
          {sheet === "people" ? (
            <>
              <Text style={styles.cardTitle}>Mudar o número de pessoas</Text>
              <Muted>Hoje: {ev.adults ?? 0} adultos · {ev.children ?? 0} crianças. Pessoas além do pacote podem mudar o valor; o buffet confirma.</Muted>
              <Row>
                <Field label="Adultos"><Input value={peopleAdults} onChangeText={(v: string) => setPeopleAdults(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={String(ev.adults ?? 0)} /></Field>
                <Field label="Crianças"><Input value={peopleChildren} onChangeText={(v: string) => setPeopleChildren(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={String(ev.children ?? 0)} /></Field>
              </Row>
              <Button title="Enviar pedido" loading={ask.isPending} disabled={!peopleAdults && !peopleChildren} onPress={() => send({ kind: "PEOPLE", message: `${first} pediu ${peopleAdults || (ev.adults ?? 0)} adultos e ${peopleChildren || (ev.children ?? 0)} crianças.`, payload: { adults: Number(peopleAdults || ev.adults || 0), children: Number(peopleChildren || ev.children || 0) } })} />
            </>
          ) : null}
          {sheet === "other" ? (
            <>
              <Text style={styles.cardTitle}>Outro pedido</Text>
              <Field label="Conte para o buffet"><Input value={freeText} onChangeText={setFreeText} placeholder="Ex.: podemos chegar 30 min antes para decorar?" multiline style={{ height: 90, textAlignVertical: "top", paddingTop: 10 }} /></Field>
              <Button title="Enviar" loading={ask.isPending} disabled={freeText.trim().length < 3} onPress={() => send({ kind: "OTHER", message: freeText.trim() })} />
            </>
          ) : null}
          <Button title="Fechar" variant="ghost" size="sm" onPress={close} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
