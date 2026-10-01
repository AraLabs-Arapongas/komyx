"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { submitPublicRequest } from "@/lib/actions/public";
import type { ActionResult } from "@/lib/action-result";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { cn, formatCurrency } from "@/lib/utils";
import { buildQuoteLines, sumLines, LEAD_SOURCES, type PackagePricing, type AddonPricing } from "@/lib/pricing";

type Addon = AddonPricing & { description: string | null };
type Props = {
  slug: string;
  packages: (PackagePricing & { description: string | null })[];
  addons: Addon[];
  defaultSource: string;
  preselectedPackage: string;
  today: string;
  durationMinutes: number;
};

const STEPS = ["Pacote", "Data", "Pessoas", "Seus dados"] as const;
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function daysInMonth(month: string) { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function weekdayOf(key: string) { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const t = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function fmtDate(key: string) { const [y, m, d] = key.split("-"); return `${d}/${m}/${y}`; }

export function QuoteWizard({ slug, packages, addons, defaultSource, preselectedPackage, today, durationMinutes }: Props) {
  const [state, action] = useActionState<ActionResult<{ estimated_total: number | null }> | undefined, FormData>(submitPublicRequest, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const initial = packages.find((p) => p.id === preselectedPackage) ?? null;
  const [step, setStep] = useState(initial ? 1 : 0);
  const [packageId, setPackageId] = useState<string | null>(initial?.id ?? null);
  const [adults, setAdults] = useState(initial?.included_adults ?? 10);
  const [children, setChildren] = useState(initial?.included_children ?? 10);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [month, setMonth] = useState(today.slice(0, 7));
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState("15:00");
  const [busy, setBusy] = useState<Record<string, string[]>>({});
  const loadingMonth = !busy[month];

  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const lines = useMemo(() => buildQuoteLines(pkg, adults, children, addons.filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon: a, quantity: qty[a.id] }))), [pkg, adults, children, addons, qty]);
  const total = sumLines(lines);
  const addonsJson = JSON.stringify(addons.filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon_id: a.id, quantity: qty[a.id] })));
  const known = LEAD_SOURCES.some((s) => s.value === defaultSource);

  useEffect(() => {
    if (busy[month]) return;
    let cancelled = false;
    fetch(`/p/${slug}/disponibilidade?m=${month}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setBusy((b) => ({ ...b, [month]: Array.isArray(d.busy) ? d.busy : [] })); })
      .catch(() => { if (!cancelled) setBusy((b) => ({ ...b, [month]: [] })); });
    return () => { cancelled = true; };
  }, [month, slug, busy]);

  function choosePackage(id: string | null) {
    setPackageId(id);
    const p = packages.find((x) => x.id === id);
    if (p) { setAdults(p.included_adults); setChildren(p.included_children); }
  }

  if (state?.ok) {
    return (
      <div className="scallop rounded-b-3xl pt-8 px-5 pb-6 sm:px-8 space-y-3">
        <p className="display font-extrabold text-2xl">Recebemos seu pedido 🎉</p>
        <Alert tone="success">{state.message}</Alert>
        <ul className="text-sm space-y-1" style={{ color: "var(--muted-ink)" }}>
          {pkg ? <li>Pacote: <b style={{ color: "var(--ink)" }}>{pkg.name}</b></li> : null}
          {date ? <li>Data: <b style={{ color: "var(--ink)" }}>{fmtDate(date)} às {time}</b></li> : null}
          <li>Pessoas: <b style={{ color: "var(--ink)" }}>{adults} adultos e {children} crianças</b></li>
          {state.data?.estimated_total != null ? <li>Estimativa: <b style={{ color: "var(--ink)" }}>{formatCurrency(state.data.estimated_total)}</b></li> : null}
        </ul>
      </div>
    );
  }

  const busyDays = new Set(busy[month] ?? []);
  const canNext = step === 0 ? true : step === 1 ? Boolean(date) : step === 2 ? adults + children > 0 : true;

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="package_id" value={packageId ?? ""} />
      <input type="hidden" name="addons" value={addonsJson} />
      <input type="hidden" name="desired_date" value={date} />
      <input type="hidden" name="desired_time" value={time} />
      <input type="hidden" name="adults" value={adults} />
      <input type="hidden" name="children" value={children} />
      {defaultSource && !known ? <input type="hidden" name="source" value={defaultSource} /> : null}

      {/* Stepper */}
      <ol className="flex items-center gap-1 text-xs font-bold" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1 flex-1 min-w-0">
            <button type="button" onClick={() => i < step && setStep(i)} disabled={i > step} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1.5 w-full", i === step ? "text-white" : i < step ? "text-[var(--ink)]" : "text-[var(--muted-ink)]")} style={{ background: i === step ? "var(--ink)" : i < step ? "var(--paper-2)" : "transparent" }}>
              <span className="grid h-5 w-5 place-items-center rounded-full text-[10px]" style={{ background: i < step ? "var(--mint)" : i === step ? "var(--sun)" : "#e5e1d6", color: "var(--ink)" }}>{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
              <span className="truncate">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="scallop rounded-b-3xl pt-8 px-5 pb-6 sm:px-8 space-y-4 min-h-[22rem]">
        {step === 0 ? (
          <>
            <h2 className="display font-extrabold text-2xl">Qual pacote?</h2>
            <div className="grid gap-2">
              {packages.map((p) => (
                <button type="button" key={p.id} onClick={() => choosePackage(p.id)} className={cn("text-left rounded-2xl border-2 p-4 transition", packageId === p.id ? "border-[var(--berry)] bg-white" : "border-[#ece7dc] bg-white/60 hover:border-[var(--berry)]/40")}>
                  <div className="flex items-center justify-between gap-3"><span className="display font-bold text-lg">{p.name}</span><span className="display font-extrabold text-lg" style={{ color: "var(--berry)" }}>{formatCurrency(p.base_price)}</span></div>
                  <p className="text-xs" style={{ color: "var(--muted-ink)" }}>{p.included_adults} adultos + {p.included_children} crianças inclusos · extra {formatCurrency(p.extra_adult_price)}/adulto, {formatCurrency(p.extra_child_price)}/criança</p>
                  {p.description ? <p className="text-sm mt-1">{p.description}</p> : null}
                </button>
              ))}
              <button type="button" onClick={() => choosePackage(null)} className={cn("text-left rounded-2xl border-2 p-4", packageId === null ? "border-[var(--berry)] bg-white" : "border-[#ece7dc] bg-white/60")}>
                <span className="display font-bold text-lg">Sem pacote</span><p className="text-xs" style={{ color: "var(--muted-ink)" }}>Quero algo personalizado; o buffet monta comigo.</p>
              </button>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="display font-extrabold text-2xl">Qual dia?</h2>
            <p className="text-sm" style={{ color: "var(--muted-ink)" }}>Dias riscados já têm festa marcada. Fazemos uma festa por dia para cuidar de tudo com calma.</p>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} disabled={month <= today.slice(0, 7)} className="h-10 w-10 grid place-items-center rounded-full bg-white border disabled:opacity-30" style={{ borderColor: "#ece7dc" }} aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></button>
              <span className="display font-bold text-lg capitalize">{MONTHS[Number(month.slice(5)) - 1]} de {month.slice(0, 4)}</span>
              <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="h-10 w-10 grid place-items-center rounded-full bg-white border" style={{ borderColor: "#ece7dc" }} aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className={cn("grid grid-cols-7 gap-1 text-center text-xs font-bold", loadingMonth && "opacity-60")} style={{ color: "var(--muted-ink)" }}>{WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}</div>
            <div className={cn("grid grid-cols-7 gap-1", loadingMonth && "opacity-60")} role="grid" aria-busy={loadingMonth}>
              {Array.from({ length: weekdayOf(`${month}-01`) }).map((_, i) => <div key={`pad-${i}`} />)}
              {Array.from({ length: daysInMonth(month) }).map((_, i) => {
                const key = `${month}-${String(i + 1).padStart(2, "0")}`;
                const past = key < today;
                const isBusy = busyDays.has(key);
                const disabled = past || isBusy;
                const selected = key === date;
                return (
                  <button type="button" key={key} disabled={disabled} onClick={() => setDate(key)} aria-label={`${fmtDate(key)}${isBusy ? ", ocupado" : ""}`}
                    className={cn("aspect-square rounded-xl text-sm font-bold grid place-items-center transition", selected ? "text-white" : disabled ? "cursor-not-allowed" : "bg-white hover:bg-[var(--paper-2)]")}
                    style={selected ? { background: "var(--berry)" } : isBusy ? { background: "#f1ede4", color: "#b5b0a4", textDecoration: "line-through" } : past ? { color: "#cfcac0" } : undefined}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Field label="Horário de início" htmlFor="wizard_time"><Input id="wizard_time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value || "15:00")} /></Field>
              <div className="text-sm pt-7" style={{ color: "var(--muted-ink)" }}>{date ? <>Festa em <b style={{ color: "var(--ink)" }}>{fmtDate(date)}</b>, das {time} às {addMinutes(time, durationMinutes)}</> : "Escolha um dia livre no calendário"}</div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="display font-extrabold text-2xl">Quantas pessoas?</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Adultos" htmlFor="w_adults"><Input id="w_adults" type="number" inputMode="numeric" min={0} value={adults} onChange={(e) => setAdults(Number(e.target.value || 0))} /></Field>
              <Field label="Crianças" htmlFor="w_children"><Input id="w_children" type="number" inputMode="numeric" min={0} value={children} onChange={(e) => setChildren(Number(e.target.value || 0))} /></Field>
            </div>
            {pkg && (adults > pkg.included_adults || children > pkg.included_children) ? (
              <p className="text-xs rounded-xl px-3 py-2" style={{ background: "#fff4d6", color: "#7a4d00" }}>Acima do incluso: {Math.max(adults - pkg.included_adults, 0)} adulto(s) e {Math.max(children - pkg.included_children, 0)} criança(s) entram como extra.</p>
            ) : null}
            {addons.length ? (
              <div>
                <h3 className="display font-bold text-lg mt-2">Adicionais <span className="font-normal text-sm" style={{ color: "var(--muted-ink)" }}>(opcional)</span></h3>
                <ul className="divide-y" style={{ borderColor: "#ece7dc" }}>
                  {addons.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0"><p className="font-bold">{a.name}</p><p className="text-xs" style={{ color: "var(--muted-ink)" }}>{formatCurrency(a.price)}{a.description ? ` · ${a.description}` : ""}</p></div>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label={`Menos ${a.name}`} onClick={() => setQty((q) => ({ ...q, [a.id]: Math.max((q[a.id] ?? 0) - 1, 0) }))} className="h-9 w-9 rounded-full bg-white border" style={{ borderColor: "#ece7dc" }}>−</button>
                        <span className="w-8 text-center font-bold">{qty[a.id] ?? 0}</span>
                        <button type="button" aria-label={`Mais ${a.name}`} onClick={() => setQty((q) => ({ ...q, [a.id]: (q[a.id] ?? 0) + 1 }))} className="h-9 w-9 rounded-full bg-white border" style={{ borderColor: "#ece7dc" }}>+</button>
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
            <h2 className="display font-extrabold text-2xl">Pra quem mandamos a resposta?</h2>
            <Field label="Seu nome" htmlFor="name" error={fe.name}><Input id="name" name="name" autoComplete="name" required /></Field>
            <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp}><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aniversariante" htmlFor="celebrant_name"><Input id="celebrant_name" name="celebrant_name" placeholder="Nome" /></Field>
              <Field label="Nascimento" htmlFor="celebrant_birth_date"><Input id="celebrant_birth_date" name="celebrant_birth_date" type="date" /></Field>
            </div>
            {defaultSource && !known ? null : (
              <Field label="Como nos conheceu?" htmlFor="source">
                <Select id="source" name="source" defaultValue={known ? defaultSource : ""}>
                  <option value="">Selecione</option>
                  {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Observações" htmlFor="message"><Textarea id="message" name="message" placeholder="Tema, restrições, dúvidas..." className="min-h-16" /></Field>
          </>
        ) : null}
      </div>

      {/* Summary + nav */}
      <div className="rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="flex-1 text-sm" style={{ color: "#cfd2e6" }}>
          <p><b className="display text-2xl text-white">{formatCurrency(total)}</b> estimado</p>
          <p className="truncate">{pkg ? pkg.name : "Sem pacote"}{date ? ` · ${fmtDate(date)} ${time}` : ""} · {adults}A {children}C{lines.filter((l) => l.kind === "ADDON").length ? ` · ${lines.filter((l) => l.kind === "ADDON").length} adicional(is)` : ""}</p>
        </div>
        <div className="flex gap-2">
          {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="h-12 px-4 rounded-full font-bold ring-2 ring-inset ring-white/30">Voltar</button> : null}
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="h-12 px-5 rounded-full font-extrabold disabled:opacity-40" style={{ background: "var(--berry)", color: "#fff" }}>Continuar</button>
          ) : (
            <SubmitButton size="lg" className="rounded-full font-extrabold" style={{ background: "var(--berry)" }} pendingText="Enviando...">Enviar pedido</SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
