"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { createEvent } from "@/lib/actions/events";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { MonthPicker, fmtBrDate } from "@/components/calendar/month-picker";
import { CustomerField } from "@/components/events/customer-field";
import { cn, formatCurrency, formatPhone } from "@/lib/utils";
import { buildQuoteLines, sumLines, extrasFor, LEAD_SOURCES, type PackagePricing, type AddonPricing } from "@/lib/pricing";

type Customer = { id: string; name: string; whatsapp: string };
type Props = {
  slug: string;
  packages: PackagePricing[];
  addons: (AddonPricing & { description: string | null })[];
  customer: Customer | null;
  request: {
    id: string; name: string; whatsapp: string; adults: number | null; children: number | null; message: string | null; source: string | null;
    celebrant_name: string | null; celebrant_birth_date: string | null; package_id: string | null; estimated_total: number | string | null;
    addons: { addon_id: string; quantity: number }[] | null;
  } | null;
  defaults: { date: string; start: string; durationMinutes: number; validityHours: number; today: string };
  initialStatus: "QUOTE" | "PRE_RESERVED" | "CONFIRMED";
  isOwner: boolean;
  sameDayWarning?: string | null;
};

const STEPS = ["Pacote", "Data", "Pessoas", "Cliente", "Revisão"] as const;

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const t = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export function NewEventWizard({ slug, packages, addons, customer, request, defaults, initialStatus, isOwner, sameDayWarning }: Props) {
  const [state, action] = useActionState(createEvent, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const initialPkg = packages.find((p) => p.id === request?.package_id) ?? null;

  const [step, setStep] = useState(0);
  const [packageId, setPackageId] = useState<string | null>(initialPkg?.id ?? null);
  const [adults, setAdults] = useState<number>(request?.adults ?? initialPkg?.included_adults ?? 0);
  const [children, setChildren] = useState<number>(request?.children ?? initialPkg?.included_children ?? 0);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries((request?.addons ?? []).map((a) => [a.addon_id, a.quantity])));
  const [month, setMonth] = useState(defaults.date.slice(0, 7));
  const [date, setDate] = useState(defaults.date);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(addMinutes(defaults.start, defaults.durationMinutes));
  const [busy, setBusy] = useState<Record<string, string[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(customer);
  const [contact, setContact] = useState({ name: request?.name ?? "", whatsapp: request?.whatsapp ?? "", source: request?.source ?? "", celebrant_name: request?.celebrant_name ?? "", celebrant_age: "", celebrant_birth_date: request?.celebrant_birth_date ?? "", title: "", notes: request?.message ?? "" });
  const [status, setStatus] = useState<Props["initialStatus"]>(initialStatus);

  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const lines = useMemo(() => buildQuoteLines(pkg, adults, children, addons.filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon: a, quantity: qty[a.id] }))), [pkg, adults, children, addons, qty]);
  const total = sumLines(lines);
  const { extraAdults, extraChildren } = extrasFor(pkg, adults, children);
  const busySet = new Set(busy[month] ?? []);
  const dayBusy = busySet.has(date);
  const sameDay = sameDayWarning ?? (state && !state.ok ? state.fieldErrors?.same_day : undefined) ?? (dayBusy && status !== "QUOTE" ? "já marcado na agenda" : undefined);

  useEffect(() => {
    if (busy[month]) return;
    let cancelled = false;
    fetch(`/p/${slug}/disponibilidade?m=${month}`).then((r) => r.json()).then((d) => { if (!cancelled) setBusy((b) => ({ ...b, [month]: Array.isArray(d.busy) ? d.busy : [] })); }).catch(() => { if (!cancelled) setBusy((b) => ({ ...b, [month]: [] })); });
    return () => { cancelled = true; };
  }, [month, slug, busy]);

  function choosePackage(id: string | null) {
    setPackageId(id);
    const p = packages.find((x) => x.id === id);
    if (p) { setAdults(p.included_adults); setChildren(p.included_children); }
  }
  const upd = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setContact((c) => ({ ...c, [k]: e.target.value }));
  const customerOk = selectedCustomer ? true : contact.name.trim().length >= 2 && contact.whatsapp.replace(/\D/g, "").length >= 10;
  const canNext = step === 1 ? Boolean(date) && end > start : step === 3 ? customerOk : true;

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {request ? <input type="hidden" name="request_id" value={request.id} /> : null}
      <input type="hidden" name="package_id" value={packageId ?? ""} />
      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />
      <input type="hidden" name="addons" value={JSON.stringify(addons.filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon_id: a.id, quantity: qty[a.id] })))} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="start_time" value={start} />
      <input type="hidden" name="end_time" value={end} />
      {selectedCustomer ? <input type="hidden" name="customer_id" value={selectedCustomer.id} /> : null}
      <input type="hidden" name="customer_name" value={selectedCustomer ? selectedCustomer.name : contact.name} />
      <input type="hidden" name="whatsapp" value={selectedCustomer ? selectedCustomer.whatsapp : contact.whatsapp} />
      <input type="hidden" name="source" value={contact.source} />
      <input type="hidden" name="title" value={contact.title} />
      <input type="hidden" name="celebrant_name" value={contact.celebrant_name} />
      <input type="hidden" name="celebrant_age" value={contact.celebrant_age} />
      <input type="hidden" name="celebrant_birth_date" value={contact.celebrant_birth_date} />
      <input type="hidden" name="notes" value={contact.notes} />
      <input type="hidden" name="status" value={status} />

      <ol className="flex items-center gap-1 text-xs font-bold" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1 min-w-0">
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1.5 w-full", i === step ? "bg-brand text-brand-fg" : i < step ? "bg-brand-soft text-brand" : "text-muted")}>
              <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px]", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-white text-brand" : "bg-stone-200 text-muted")}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
              <span className="truncate">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <Card>
        <CardBody className="pt-4 space-y-3">
          {step === 0 ? (
            <>
              <h2 className="font-semibold text-lg">Qual pacote?</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {packages.map((p) => (
                  <button type="button" key={p.id} onClick={() => choosePackage(p.id)} className={cn("text-left rounded-xl border-2 p-3 transition", packageId === p.id ? "border-brand bg-brand-soft/40" : "border-border hover:border-brand/40")}>
                    <div className="flex items-center justify-between gap-3"><span className="font-semibold">{p.name}</span><span className="font-semibold text-brand">{formatCurrency(p.base_price)}</span></div>
                    <p className="text-xs text-muted">{p.included_adults} adultos + {p.included_children} crianças · extra {formatCurrency(p.extra_adult_price)}/adulto, {formatCurrency(p.extra_child_price)}/criança</p>
                  </button>
                ))}
                <button type="button" onClick={() => choosePackage(null)} className={cn("text-left rounded-xl border-2 p-3", packageId === null ? "border-brand bg-brand-soft/40" : "border-border")}>
                  <span className="font-semibold">Sem pacote</span><p className="text-xs text-muted">Personalizado; o orçamento parte do zero.</p>
                </button>
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h2 className="font-semibold text-lg">Qual dia?</h2>
              <p className="text-sm text-muted">Dias riscados já têm festa.{isOwner ? " Você pode escolher mesmo assim; a equipe não." : ""}</p>
              <MonthPicker month={month} onMonthChange={setMonth} date={date} onDateChange={setDate} today={defaults.today} busy={busySet} loading={!busy[month]} allowBusy={isOwner} />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Field label="Início" htmlFor="w_start" error={fe.start_time}><Input id="w_start" type="time" step={900} value={start} onChange={(e) => { const v = e.target.value; setStart(v); if (v) setEnd(addMinutes(v, defaults.durationMinutes)); }} /></Field>
                <Field label="Fim" htmlFor="w_end" error={fe.end_time}><Input id="w_end" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
              </div>
              <p className="text-sm text-muted">{date ? <>Festa em <b className="text-foreground">{fmtBrDate(date)}</b>, das {start} às {end}{dayBusy ? <span className="text-amber-700"> · este dia já tem evento</span> : null}</> : "Escolha um dia."}</p>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="font-semibold text-lg">Quantas pessoas?</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Adultos" htmlFor="w_adults" error={fe.adults}><Input id="w_adults" type="number" inputMode="numeric" min={0} value={adults} onChange={(e) => setAdults(Number(e.target.value || 0))} /></Field>
                <Field label="Crianças" htmlFor="w_children" error={fe.children}><Input id="w_children" type="number" inputMode="numeric" min={0} value={children} onChange={(e) => setChildren(Number(e.target.value || 0))} /></Field>
              </div>
              {pkg && (extraAdults > 0 || extraChildren > 0) ? <p className="text-xs rounded-lg px-3 py-2 bg-amber-50 border border-amber-200 text-amber-900">Extras além do pacote: {extraAdults} adulto(s) × {formatCurrency(pkg.extra_adult_price)} · {extraChildren} criança(s) × {formatCurrency(pkg.extra_child_price)}</p> : null}
              {addons.length ? (
                <div>
                  <h3 className="font-medium mt-2">Adicionais <span className="text-muted font-normal text-sm">(opcional)</span></h3>
                  <ul className="divide-y divide-border">
                    {addons.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0"><p className="font-medium">{a.name}</p><p className="text-xs text-muted">{formatCurrency(a.price)}{a.description ? ` · ${a.description}` : ""}</p></div>
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label={`Menos ${a.name}`} onClick={() => setQty((q) => ({ ...q, [a.id]: Math.max((q[a.id] ?? 0) - 1, 0) }))} className="h-9 w-9 rounded-lg border border-border">−</button>
                          <span className="w-8 text-center font-medium">{qty[a.id] ?? 0}</span>
                          <button type="button" aria-label={`Mais ${a.name}`} onClick={() => setQty((q) => ({ ...q, [a.id]: (q[a.id] ?? 0) + 1 }))} className="h-9 w-9 rounded-lg border border-border">+</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="font-semibold text-lg">Cliente</h2>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-border px-3 py-2.5">
                  <div><p className="font-medium">{selectedCustomer.name}</p><p className="text-sm text-muted">{formatPhone(selectedCustomer.whatsapp)} · cliente já cadastrado</p></div>
                  <button type="button" className="text-sm text-brand font-medium" onClick={() => setSelectedCustomer(null)}>Trocar</button>
                </div>
              ) : (
                <>
                  <CustomerField initialName={contact.name} error={fe.customer_name} onPick={(c) => setSelectedCustomer(c)} onChange={(v) => setContact((c) => ({ ...c, name: v }))} />
                  <Field label="WhatsApp" htmlFor="w_whatsapp" error={fe.whatsapp} hint="DDD + número. Cliente novo é cadastrado automaticamente ao salvar."><Input id="w_whatsapp" type="tel" inputMode="tel" value={contact.whatsapp} onChange={upd("whatsapp")} placeholder="(11) 99999-9999" /></Field>
                  <Field label="Como conheceu o buffet?" htmlFor="w_source"><Select id="w_source" value={contact.source} onChange={upd("source")}><option value="">Não informado</option>{LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
                </>
              )}
              <div className="grid grid-cols-[1fr_80px] gap-3">
                <Field label="Aniversariante" htmlFor="w_celebrant"><Input id="w_celebrant" value={contact.celebrant_name} onChange={upd("celebrant_name")} placeholder="Nome" /></Field>
                <Field label="Idade" htmlFor="w_age" error={fe.celebrant_age}><Input id="w_age" type="number" inputMode="numeric" min={0} max={150} value={contact.celebrant_age} onChange={upd("celebrant_age")} /></Field>
              </div>
              <Field label="Data de nascimento do aniversariante" htmlFor="w_birth" hint="Entra na lista de aniversariantes para lembrar no próximo ano."><Input id="w_birth" type="date" value={contact.celebrant_birth_date} onChange={upd("celebrant_birth_date")} /></Field>
              <Field label="Nome do evento" htmlFor="w_title"><Input id="w_title" value={contact.title} onChange={upd("title")} placeholder="Ex.: Aniversário da Júlia" /></Field>
              <Field label="Observações" htmlFor="w_notes"><Textarea id="w_notes" value={contact.notes} onChange={upd("notes")} className="min-h-16" /></Field>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h2 className="font-semibold text-lg">Confira e salve</h2>
              <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted">Cliente</dt><dd className="font-medium">{selectedCustomer ? `${selectedCustomer.name} · ${formatPhone(selectedCustomer.whatsapp)}` : `${contact.name} · ${contact.whatsapp} (novo)`}</dd>
                <dt className="text-muted">Data</dt><dd className="font-medium">{fmtBrDate(date)}, das {start} às {end}</dd>
                <dt className="text-muted">Pacote</dt><dd className="font-medium">{pkg ? pkg.name : "Sem pacote (personalizado)"}</dd>
                <dt className="text-muted">Pessoas</dt><dd className="font-medium">{adults} adultos · {children} crianças{pkg && (extraAdults || extraChildren) ? <span className="text-muted font-normal"> (com extras)</span> : null}</dd>
                <dt className="text-muted">Adicionais</dt><dd className="font-medium">{lines.filter((l) => l.kind === "ADDON").map((l) => `${l.description} × ${l.quantity}`).join(", ") || "Nenhum"}</dd>
                {contact.celebrant_name ? <><dt className="text-muted">Aniversariante</dt><dd className="font-medium">{contact.celebrant_name}{contact.celebrant_age ? `, ${contact.celebrant_age} anos` : ""}</dd></> : null}
                <dt className="text-muted">Orçamento</dt><dd className="font-semibold text-brand">{formatCurrency(total)}</dd>
              </dl>
              <Field label="Reservar a data?" htmlFor="w_status" hint="O orçamento é criado em todos os casos.">
                <Select id="w_status" value={status} onChange={(e) => setStatus(e.target.value as Props["initialStatus"])}>
                  <option value="PRE_RESERVED">Sim, segurar a data por {defaults.validityHours}h (aguardando confirmação)</option>
                  <option value="QUOTE">Não, só o orçamento (não bloqueia a agenda)</option>
                  <option value="CONFIRMED">Já está fechado: confirmar evento</option>
                </Select>
              </Field>
              {sameDay && status !== "QUOTE" && isOwner ? (
                <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                  <input type="checkbox" name="force_same_day" className="mt-0.5 h-4 w-4" defaultChecked={Boolean(sameDayWarning)} />
                  <span><b>Já tem evento neste dia</b> ({sameDay}). Sei disso e quero marcar outro mesmo assim.</span>
                </label>
              ) : null}
              {sameDay && status !== "QUOTE" && !isOwner ? <Alert>Já tem evento neste dia. Só a proprietária pode marcar outro; salve como “só orçamento” ou escolha outra data.</Alert> : null}
            </>
          ) : null}
        </CardBody>
      </Card>

      <div className="sticky bottom-20 md:bottom-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border flex items-center gap-2">
        <div className="flex-1 text-sm text-muted truncate">{pkg ? pkg.name : "Sem pacote"} · {fmtBrDate(date)} {start} · {adults}A {children}C · <b className="text-foreground">{formatCurrency(total)}</b></div>
        {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="h-11 px-4 rounded-xl border border-border bg-surface text-sm font-medium">Voltar</button> : null}
        {step < STEPS.length - 1 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="h-11 px-5 rounded-xl bg-brand text-brand-fg text-sm font-medium disabled:opacity-40">Continuar</button>
        ) : (
          <SubmitButton size="lg" pendingText="Salvando..." disabled={Boolean(sameDay) && status !== "QUOTE" && !isOwner}>Salvar</SubmitButton>
        )}
      </div>
    </form>
  );
}
