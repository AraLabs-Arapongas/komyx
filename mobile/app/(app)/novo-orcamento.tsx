import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Switch, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatPhone, maskPhoneInput, normalizePhone, toDateKey } from "@/lib/format";
import { addMinutes, buildQuoteLines, localToIso, sumLines, type AddonPricing, type PackagePricing } from "@/lib/pricing";
import { supabase, WEB_URL } from "@/lib/supabase";
import { Button, Card, Field, Input, Loading, Muted, Row, styles } from "@/ui/components";
import { colors } from "@/ui/theme";

/**
 * Native quote wizard. Same rules as the web one (src/lib/actions/events.ts createEvent):
 * customer → package (+ theme, addons) → date and time → people → review. Creates the event,
 * the quote and its items; the database seeds installments and totals. Reserving the date
 * respects "one event per day" (staff blocked, owner can force).
 */
type Customer = { id: string; name: string; whatsapp: string };
type Theme = { id: string; name: string };
type Status = "PRE_RESERVED" | "QUOTE" | "CONFIRMED";

const STEPS = ["Cliente", "Pacote", "Data", "Pessoas", "Revisão"];
const TIMES = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function monthGrid(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const brDate = (key: string) => key.split("-").reverse().join("/");

export default function NovoOrcamento() {
  const { profile, org } = useAuth();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ request?: string; customer?: string; name?: string; whatsapp?: string }>();
  const today = toDateKey(new Date());

  const [step, setStep] = useState(0);
  const [term, setTerm] = useState(params.whatsapp ? maskPhoneInput(params.whatsapp) : params.name ?? "");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState(params.name ?? "");
  const [packageId, setPackageId] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [month, setMonth] = useState(today.slice(0, 7));
  const [date, setDate] = useState<string>("");
  const [start, setStart] = useState("14:00");
  const [duration, setDuration] = useState(org?.default_event_duration_minutes ?? 240);
  const [adults, setAdults] = useState("");
  const [children, setChildren] = useState("");
  const [celebrant, setCelebrant] = useState("");
  const [celebrantAge, setCelebrantAge] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("PRE_RESERVED");
  const [force, setForce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = normalizePhone(term);
  const looksLikePhone = digits.length >= 8 && !/[a-zA-Z]/.test(term);

  const catalog = useQuery({
    queryKey: ["catalog", profile?.organization_id],
    enabled: Boolean(profile),
    queryFn: async () => {
      const [p, a, t] = await Promise.all([
        supabase.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price, description").eq("active", true).order("sort_order").order("name"),
        supabase.from("package_addons").select("id, name, price, description").eq("active", true).order("sort_order").order("name"),
        supabase.from("party_themes").select("id, name").eq("active", true).order("sort_order").order("name"),
      ]);
      return { packages: (p.data ?? []) as (PackagePricing & { description: string | null })[], addons: (a.data ?? []) as (AddonPricing & { description: string | null })[], themes: (t.data ?? []) as Theme[] };
    },
  });

  // Prefill from a public request or a known customer.
  useEffect(() => {
    (async () => {
      if (params.customer) {
        const { data } = await supabase.from("customers").select("id, name, whatsapp").eq("id", params.customer).maybeSingle();
        if (data) { setCustomer(data as Customer); setStep(1); }
      }
      if (params.request) {
        const { data: r } = await supabase.from("public_requests").select("name, whatsapp, desired_date, desired_time, adults, children, participants, package_id, theme_id, addons, celebrant_name, message").eq("id", params.request).maybeSingle();
        if (!r) return;
        setTerm(maskPhoneInput(r.whatsapp)); setNewName(r.name);
        if (r.desired_date) { setDate(r.desired_date); setMonth(r.desired_date.slice(0, 7)); }
        if (r.desired_time) setStart(String(r.desired_time).slice(0, 5));
        setAdults(String(r.adults ?? r.participants ?? "")); setChildren(String(r.children ?? ""));
        if (r.package_id) setPackageId(r.package_id);
        if (r.theme_id) setThemeId(r.theme_id);
        if (Array.isArray(r.addons)) setQty(Object.fromEntries((r.addons as { addon_id: string; quantity: number }[]).map((x) => [x.addon_id, x.quantity])));
        if (r.celebrant_name) setCelebrant(r.celebrant_name);
        if (r.message) setNotes(r.message);
      }
    })();
  }, [params.customer, params.request]);

  const search = useQuery({
    queryKey: ["customers-search", term],
    enabled: step === 0 && term.trim().length >= 2 && !customer,
    queryFn: async () => {
      let qb = supabase.from("customers").select("id, name, whatsapp").eq("organization_id", profile!.organization_id).limit(6);
      qb = looksLikePhone ? qb.ilike("whatsapp", `%${digits}%`) : qb.ilike("name", `%${term.trim()}%`);
      const { data, error } = await qb.order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Customer[];
    },
  });

  const busy = useQuery({
    queryKey: ["busy", org?.slug, month],
    enabled: Boolean(org?.slug) && step === 2,
    queryFn: async () => {
      const [y, m] = month.split("-").map(Number);
      const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      const { data } = await supabase.rpc("busy_days", { p_slug: org!.slug, p_from: `${month}-01`, p_to: to });
      return new Set((data ?? []) as string[]);
    },
  });

  const pkg = catalog.data?.packages.find((p) => p.id === packageId) ?? null;
  const addonLines = useMemo(() => (catalog.data?.addons ?? []).filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon: a, quantity: qty[a.id] })), [catalog.data, qty]);
  const nAdults = Number(adults) || 0;
  const nChildren = Number(children) || 0;
  const lines = useMemo(() => buildQuoteLines(pkg, nAdults, nChildren, addonLines), [pkg, nAdults, nChildren, addonLines]);
  const total = sumLines(lines);
  const end = addMinutes(start, duration);
  const isOwner = profile?.role === "owner";
  const dateIsBusy = Boolean(date && busy.data?.has(date));

  const canNext = step === 0 ? Boolean(customer) || (looksLikePhone && newName.trim().length >= 2) : step === 2 ? Boolean(date) : step === 3 ? nAdults + nChildren > 0 : true;

  async function next() {
    setError(null);
    if (step === 0 && !customer) {
      // New customer: created only at the end, but keep the name/phone now.
      if (!looksLikePhone) { setError("Digite o WhatsApp do cliente novo."); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function create() {
    if (!profile || !org) return;
    setSaving(true); setError(null);
    try {
      // One event per day (only when the date is held).
      if (status !== "QUOTE" && org.one_event_per_day && dateIsBusy) {
        if (!isOwner) throw new Error("Já existe evento neste dia. O buffet faz um evento por dia; peça à proprietária para liberar.");
        if (!force) throw new Error("Já existe evento neste dia. Ligue \"sei que já tem evento neste dia\" para criar mesmo assim.");
      }
      let customerId = customer?.id;
      if (!customerId) {
        const { data: existing } = await supabase.from("customers").select("id").eq("organization_id", org.id).eq("whatsapp", digits).maybeSingle();
        if (existing) customerId = existing.id;
        else {
          const { data: c, error: ce } = await supabase.from("customers").insert({ organization_id: org.id, name: newName.trim(), whatsapp: digits, source: "APP" }).select("id").single();
          if (ce) throw new Error(ce.message);
          customerId = c.id;
        }
      }
      const expires_at = status === "PRE_RESERVED" ? new Date(Date.now() + org.pre_reservation_validity_hours * 3_600_000).toISOString() : null;
      const { data: ev, error: ee } = await supabase.from("events").insert({
        organization_id: org.id, customer_id: customerId, title: title.trim() || null, starts_at: localToIso(date, start), ends_at: localToIso(date, end), status,
        package_id: packageId, theme_id: themeId, adults: nAdults, children: nChildren, celebrant_name: celebrant.trim() || null, celebrant_age: celebrantAge ? Number(celebrantAge) : null,
        notes: notes.trim() || null, expires_at, created_by: profile.id,
      }).select("id").single();
      if (ee) throw new Error(ee.message);
      const { data: quote, error: qe } = await supabase.from("quotes").insert({ organization_id: org.id, event_id: ev.id, package_id: pkg?.id ?? null, adults: nAdults, children: nChildren, created_by: profile.id }).select("id").single();
      if (qe) throw new Error(qe.message);
      if (lines.length) {
        const { error: ie } = await supabase.from("quote_items").insert(lines.map((l) => ({ ...l, organization_id: org.id, quote_id: quote.id })));
        if (ie) throw new Error(ie.message);
      }
      if (params.request) await supabase.from("public_requests").update({ status: "CONVERTED", event_id: ev.id }).eq("id", params.request);
      qc.invalidateQueries();
      router.replace({ pathname: "/(app)/eventos/[id]", params: { id: ev.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const publicUrl = org ? `${WEB_URL}/p/${org.slug}` : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Steps */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingTop: 12 }}>
        {STEPS.map((s, i) => (
          <Pressable key={s} onPress={() => i < step && setStep(i)} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ height: 4, width: "100%", borderRadius: 2, backgroundColor: i <= step ? colors.brand : colors.border }} />
            <Text style={{ fontSize: 10, fontWeight: i === step ? "700" : "500", color: i === step ? colors.brand : colors.muted }}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Text style={[styles.title, { fontSize: 22 }]}>Para quem é o orçamento?</Text>
            {customer ? (
              <Card>
                <Row style={{ justifyContent: "space-between" }}>
                  <View><Text style={styles.h3}>{customer.name}</Text><Muted>{formatPhone(customer.whatsapp)}</Muted></View>
                  <Button title="Trocar" size="sm" variant="ghost" onPress={() => { setCustomer(null); setTerm(""); }} />
                </Row>
              </Card>
            ) : (
              <>
                <Field label="WhatsApp ou nome"><Input value={term} onChangeText={(v: string) => { setTerm(maskPhoneInput(v)); setError(null); }} placeholder="(11) 99999-0000 ou Mariana" autoFocus autoCorrect={false} /></Field>
                {search.data?.map((c) => (
                  <Pressable key={c.id} onPress={() => { setCustomer(c); setStep(1); }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: pressed ? colors.stone100 : colors.surface, borderWidth: 1, borderColor: colors.border })}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.brand, fontWeight: "800" }}>{c.name.slice(0, 1).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}><Text style={styles.h3}>{c.name}</Text><Muted>{formatPhone(c.whatsapp)} · já é cliente</Muted></View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Pressable>
                ))}
                {looksLikePhone && !search.data?.some((c) => normalizePhone(c.whatsapp) === digits) ? (
                  <Card tone="brand">
                    <Text style={styles.h3}>Cliente novo · {formatPhone(digits)}</Text>
                    <Field label="Nome do responsável"><Input value={newName} onChangeText={setNewName} placeholder="Ex.: Mariana Costa" autoCapitalize="words" /></Field>
                  </Card>
                ) : null}
                {publicUrl ? <Button title="Ou mande sua página para o cliente montar sozinho" variant="ghost" size="sm" onPress={() => Share.share({ message: `Monte o orçamento da sua festa no ${org?.name}: ${publicUrl}` })} /> : null}
              </>
            )}
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={[styles.title, { fontSize: 22 }]}>Pacote</Text>
            {!catalog.data ? <Loading /> : (
              <>
                {catalog.data.packages.map((p) => (
                  <Pressable key={p.id} onPress={() => setPackageId(p.id)} style={{ padding: 14, borderRadius: 14, borderWidth: 2, borderColor: packageId === p.id ? colors.brand : colors.border, backgroundColor: colors.surface, gap: 2 }}>
                    <Row style={{ justifyContent: "space-between" }}><Text style={styles.h3}>{p.name}</Text><Text style={{ fontWeight: "800", color: colors.brand }}>{formatCurrency(p.base_price)}</Text></Row>
                    <Muted>{p.included_adults} adultos + {p.included_children} crianças{p.description ? ` · ${p.description}` : ""}</Muted>
                  </Pressable>
                ))}
                <Pressable onPress={() => setPackageId(null)} style={{ padding: 14, borderRadius: 14, borderWidth: 2, borderColor: packageId === null ? colors.brand : colors.border, backgroundColor: colors.surface }}>
                  <Text style={styles.h3}>Sem pacote</Text><Muted>Personalizado; itens entram depois no orçamento.</Muted>
                </Pressable>
                {catalog.data.themes.length ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.label}>Tema (opcional)</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {catalog.data.themes.map((t) => (
                        <Pressable key={t.id} onPress={() => setThemeId(themeId === t.id ? null : t.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: themeId === t.id ? colors.brand : colors.border, backgroundColor: themeId === t.id ? colors.brandSoft : colors.surface }}>
                          <Text style={{ fontSize: 13, fontWeight: "600", color: themeId === t.id ? colors.brand : colors.foreground }}>{t.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                {catalog.data.addons.length ? (
                  <View style={{ gap: 6 }}>
                    <Text style={styles.label}>Adicionais (opcional)</Text>
                    {catalog.data.addons.map((a) => (
                      <Row key={a.id} style={{ justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <View style={{ flex: 1 }}><Text style={styles.text}>{a.name}</Text><Muted>{formatCurrency(a.price)}</Muted></View>
                        <Row>
                          <Pressable onPress={() => setQty((q) => ({ ...q, [a.id]: Math.max((q[a.id] ?? 0) - 1, 0) }))} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}><Text>−</Text></Pressable>
                          <Text style={{ width: 20, textAlign: "center", fontWeight: "700" }}>{qty[a.id] ?? 0}</Text>
                          <Pressable onPress={() => setQty((q) => ({ ...q, [a.id]: (q[a.id] ?? 0) + 1 }))} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.brand }}>+</Text></Pressable>
                        </Row>
                      </Row>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={[styles.title, { fontSize: 22 }]}>Data e horário</Text>
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={10}><Ionicons name="chevron-back" size={22} color={colors.foreground} /></Pressable>
                <Text style={styles.h3}>{MONTHS[Number(month.slice(5)) - 1]} de {month.slice(0, 4)}</Text>
                <Pressable onPress={() => setMonth(shiftMonth(month, 1))} hitSlop={10}><Ionicons name="chevron-forward" size={22} color={colors.foreground} /></Pressable>
              </Row>
              <View style={{ flexDirection: "row" }}>{WEEKDAYS.map((w, i) => <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, color: colors.muted, fontWeight: "700" }}>{w}</Text>)}</View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {monthGrid(month).map((key, i) => {
                  if (!key) return <View key={i} style={{ width: `${100 / 7}%`, height: 40 }} />;
                  const past = key < today; const isBusy = busy.data?.has(key); const sel = key === date;
                  return (
                    <Pressable key={key} disabled={past} onPress={() => setDate(key)} style={{ width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.brand : isBusy ? colors.amberSoft : "transparent" }}>
                        <Text style={{ fontWeight: sel || isBusy ? "700" : "500", color: sel ? "#fff" : past ? colors.border : isBusy ? colors.amber : colors.foreground }}>{Number(key.slice(8))}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              <Muted>Amarelo: dia já com festa{org?.one_event_per_day ? " (um evento por dia)" : ""}.</Muted>
            </Card>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Início</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {TIMES.map((t) => <Pressable key={t} onPress={() => setStart(t)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: start === t ? colors.brand : colors.border, backgroundColor: start === t ? colors.brandSoft : colors.surface }}><Text style={{ fontWeight: "600", color: start === t ? colors.brand : colors.foreground }}>{t}</Text></Pressable>)}
              </View>
              <Row>
                <Field label="Ou digite"><Input value={start} onChangeText={(v: string) => /^\d{0,2}:?\d{0,2}$/.test(v) && setStart(v)} placeholder="14:00" keyboardType="numbers-and-punctuation" style={{ width: 90 }} /></Field>
                <Field label="Duração"><Row>{[180, 240, 300].map((m) => <Pressable key={m} onPress={() => setDuration(m)} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: duration === m ? colors.brand : colors.border, backgroundColor: duration === m ? colors.brandSoft : colors.surface }}><Text style={{ fontWeight: "600", color: duration === m ? colors.brand : colors.foreground }}>{m / 60}h</Text></Pressable>)}</Row></Field>
              </Row>
              {date ? <Muted>{brDate(date)} · {start} às {end}</Muted> : null}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={[styles.title, { fontSize: 22 }]}>Pessoas e festa</Text>
            <Row>
              <Field label="Adultos"><Input value={adults} onChangeText={(v: string) => setAdults(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={pkg ? String(pkg.included_adults) : "30"} /></Field>
              <Field label="Crianças"><Input value={children} onChangeText={(v: string) => setChildren(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder={pkg ? String(pkg.included_children) : "30"} /></Field>
            </Row>
            {pkg && (nAdults > pkg.included_adults || nChildren > pkg.included_children) ? <Muted>Além do pacote: adicionais cobrados por pessoa.</Muted> : null}
            <Row>
              <View style={{ flex: 2 }}><Field label="Aniversariante"><Input value={celebrant} onChangeText={setCelebrant} placeholder="Nome" autoCapitalize="words" /></Field></View>
              <View style={{ flex: 1 }}><Field label="Idade"><Input value={celebrantAge} onChangeText={(v: string) => setCelebrantAge(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="5" /></Field></View>
            </Row>
            <Field label="Título da festa (opcional)"><Input value={title} onChangeText={setTitle} placeholder={celebrant ? `Festa ${celebrant}` : "Ex.: Festa do Theo"} /></Field>
            <Field label="Observações (opcional)"><Input value={notes} onChangeText={setNotes} placeholder="Tema, restrições, combinados…" multiline style={{ height: 80, textAlignVertical: "top", paddingTop: 10 }} /></Field>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Text style={[styles.title, { fontSize: 22 }]}>Confira e salve</Text>
            <Card>
              {[["Cliente", customer ? customer.name : `${newName} · ${formatPhone(digits)}`], ["Pacote", pkg ? pkg.name : "Sem pacote"], ["Data", `${brDate(date)}, ${start} às ${end}`], ["Pessoas", `${nAdults} adultos · ${nChildren} crianças`], celebrant ? ["Aniversariante", `${celebrant}${celebrantAge ? ` · ${celebrantAge} anos` : ""}`] : null].filter(Boolean).map((r) => (
                <Row key={(r as string[])[0]} style={{ justifyContent: "space-between" }}><Muted>{(r as string[])[0]}</Muted><Text style={[styles.text, { fontWeight: "600", flexShrink: 1, textAlign: "right" }]}>{(r as string[])[1]}</Text></Row>
              ))}
            </Card>
            <Card>
              <Text style={styles.h3}>Orçamento</Text>
              {lines.length === 0 ? <Muted>Sem itens ainda (personalizado).</Muted> : lines.map((l) => <Row key={l.description} style={{ justifyContent: "space-between" }}><Muted>{l.description}{l.kind === "ADDON" && l.quantity > 1 ? ` × ${l.quantity}` : ""}</Muted><Text style={styles.text}>{formatCurrency(l.quantity * l.unit_price)}</Text></Row>)}
              <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}><Text style={styles.h3}>Total estimado</Text><Text style={{ fontSize: 20, fontWeight: "800", color: colors.brand }}>{lines.length ? formatCurrency(total) : "A combinar"}</Text></Row>
            </Card>
            <View style={{ gap: 8 }}>
              <Text style={styles.label}>O que fazer com a data</Text>
              {([["PRE_RESERVED", "Reservar a data", `Segura ${brDate(date)} por ${org?.pre_reservation_validity_hours ?? 48}h enquanto o cliente paga o sinal.`], ["QUOTE", "Só orçamento", "Não segura a data. Vira reserva quando o cliente decidir."], ...(isOwner ? [["CONFIRMED", "Confirmar direto", "Já está acertado com o cliente."]] : [])] as [Status, string, string][]).map(([s, t, d]) => (
                <Pressable key={s} onPress={() => setStatus(s)} style={{ padding: 12, borderRadius: 14, borderWidth: 2, borderColor: status === s ? colors.brand : colors.border, backgroundColor: colors.surface }}>
                  <Text style={styles.h3}>{t}</Text><Muted>{d}</Muted>
                </Pressable>
              ))}
              {dateIsBusy && status !== "QUOTE" ? (
                isOwner ? <Row style={{ justifyContent: "space-between", padding: 12, borderRadius: 14, backgroundColor: colors.amberSoft }}><Text style={{ flex: 1, color: colors.amber }}>Já tem festa neste dia. Sei disso e quero criar mesmo assim.</Text><Switch value={force} onValueChange={setForce} /></Row>
                  : <Muted style={{ color: colors.amber }}>Já tem festa neste dia; só a proprietária pode criar outra. Escolha "Só orçamento" ou outra data.</Muted>
              ) : null}
            </View>
          </>
        ) : null}

        {error ? <Text style={{ color: colors.red }}>{error}</Text> : null}
      </ScrollView>

      {/* Footer */}
      <View style={{ flexDirection: "row", gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
        {step > 0 ? <Button title="Voltar" variant="outline" onPress={() => setStep((s) => s - 1)} /> : <Button title="Cancelar" variant="ghost" onPress={() => router.back()} />}
        <View style={{ flex: 1 }}>
          {step < STEPS.length - 1 ? <Button title="Continuar" disabled={!canNext} onPress={next} /> : <Button title={status === "PRE_RESERVED" ? "Reservar e salvar" : status === "QUOTE" ? "Salvar orçamento" : "Confirmar e salvar"} loading={saving} onPress={() => (dateIsBusy && status !== "QUOTE" && !isOwner ? Alert.alert("Dia ocupado", "Escolha outra data ou salve só o orçamento.") : create())} />}
        </View>
      </View>
    </View>
  );
}
