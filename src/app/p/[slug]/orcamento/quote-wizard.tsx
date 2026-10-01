"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { MonthPicker } from "@/components/calendar/month-picker";
import { submitPublicRequest, type PublicSubmitResult } from "@/lib/actions/public";
import { CopyButton } from "@/components/ui/copy-button";
import { appUrl, formatDateTime, formatDateLong, formatTime, whatsappLink } from "@/lib/utils";
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
  showPrices: boolean;
  selfBooking: boolean;
  validityHours: number;
  depositPercent: number | null;
  depositLabel: string | null;
};

const STEPS = ["Pacote", "Data", "Pessoas", "Seus dados", "Revisão"] as const;
function known_source_default(src: string) { return LEAD_SOURCES.some((s) => s.value === src) ? src : ""; }

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const t = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
function fmtDate(key: string) { const [y, m, d] = key.split("-"); return `${d}/${m}/${y}`; }

export function QuoteWizard({ slug, packages, addons, defaultSource, preselectedPackage, today, durationMinutes, showPrices, selfBooking, validityHours, depositPercent, depositLabel }: Props) {
  const [state, action] = useActionState<ActionResult<PublicSubmitResult> | undefined, FormData>(submitPublicRequest, undefined);
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
  const [contact, setContact] = useState({ name: "", whatsapp: "", celebrant_name: "", celebrant_birth_date: "", source: known_source_default(defaultSource), message: "" });
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

  if (state?.ok && state.data?.reservation) {
    const r = state.data.reservation;
    const quoteUrl = r.quote_token ? appUrl(`/q/${r.quote_token}`) : null;
    const waText = `Olá! Reservei ${formatDateLong(r.starts_at)} às ${formatTime(r.starts_at)} pela página (código ${r.pix_txid}) e vou enviar o comprovante do sinal. Minha reserva: ${r.reservation_url}`;
    return (
      <div className="scallop rounded-b-3xl pt-8 px-5 pb-6 sm:px-8 space-y-4">
        <p className="display font-extrabold text-2xl">Data reservada 🎉</p>
        <div className="rounded-2xl p-3 text-sm space-y-2" style={{ background: "var(--ink)", color: "#fff" }}>
          <p className="font-bold">Guarde o link da sua reserva</p>
          <p className="text-xs break-all" style={{ color: "#cfd2e6" }}>{r.reservation_url}</p>
          <p className="text-xs" style={{ color: "#cfd2e6" }}>Nele você encontra o Pix, o orçamento e o contrato a qualquer hora. Perdeu? Na página do buffet, use “Encontre sua reserva” com seu WhatsApp e a data.</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={r.reservation_url} label="Copiar link" />
            <a href={`https://wa.me/?text=${encodeURIComponent(`Minha reserva no ${r.org_name}: ${r.reservation_url}`)}`} target="_blank" rel="noopener" className="h-9 px-3 inline-flex items-center rounded-lg text-sm font-bold" style={{ background: "var(--sun)", color: "var(--ink)" }}>Enviar pra mim no WhatsApp</a>
          </div>
        </div>
        <p className="text-sm">Sua festa está <b>reservada</b> para <b>{formatDateLong(r.starts_at)}</b>, das {formatTime(r.starts_at)} às {formatTime(r.ends_at)}. A data fica segura até <b>{formatDateTime(r.expires_at)}</b>.</p>
        <ol className="space-y-3 text-sm">
          <li className="rounded-2xl p-4" style={{ background: "var(--paper-2)" }}>
            <p className="display font-bold text-lg">1. Pague o sinal{r.deposit_amount != null ? <> de <span style={{ color: "var(--berry)" }}>{formatCurrency(r.deposit_amount)}</span></> : null} em até {r.deposit_hours}h</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-ink)" }}>Prazo: {formatDateTime(r.expires_at)}. Depois disso a data volta a ficar livre.</p>
            {r.pix_key ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr] sm:items-start">
                {r.pix_qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.pix_qr} alt="QR Code Pix" className="h-[150px] w-[150px] rounded-xl bg-white p-1 border" style={{ borderColor: "#ece7dc" }} />
                ) : null}
                <div className="space-y-2">
                  <p>Pix para <b>{r.org_name}</b></p>
                  <p className="flex flex-wrap items-center gap-2">Chave: <code className="rounded bg-white px-1.5 py-0.5">{r.pix_key}</code> <CopyButton text={r.pix_key} label="Copiar chave" /></p>
                  {r.pix_payload ? <p className="flex flex-wrap items-center gap-2"><span>Ou use o Pix copia e cola</span> <CopyButton text={r.pix_payload} label="Copiar código" /></p> : null}
                  <p className="text-xs rounded-lg px-2.5 py-1.5 bg-white" style={{ color: "var(--ink)" }}>Código da reserva: <b>{r.pix_txid}</b>. Ele vai no identificador do Pix e aparece no seu comprovante; se pagar manualmente, escreva esse código na descrição.</p>
                  {r.deposit_label ? <p className="text-xs" style={{ color: "var(--muted-ink)" }}>{r.deposit_label}. O restante segue o plano do orçamento.</p> : null}
                </div>
              </div>
            ) : <p className="mt-1">O buffet envia os dados de pagamento pelo WhatsApp.</p>}
          </li>
          <li className="rounded-2xl p-4" style={{ background: "var(--paper-2)" }}>
            <p className="display font-bold text-lg">2. Envie o comprovante</p>
            {r.whatsapp ? <a href={whatsappLink(r.whatsapp, waText)} target="_blank" rel="noopener" className="mt-2 inline-flex h-11 items-center justify-center rounded-full px-5 font-extrabold text-white" style={{ background: "var(--berry)" }}>Abrir WhatsApp do buffet</a> : <p>O buffet entra em contato pelo seu WhatsApp.</p>}
          </li>
          <li className="rounded-2xl p-4" style={{ background: "var(--paper-2)" }}>
            <p className="display font-bold text-lg">3. Receba o contrato</p>
            <p className="mt-1">Com o sinal confirmado, o buffet confirma a festa e envia o contrato para aceite online.</p>
            {quoteUrl ? <p className="mt-2 text-xs break-all" style={{ color: "var(--muted-ink)" }}>Seu orçamento: <a href={quoteUrl} className="underline">{quoteUrl}</a></p> : null}
          </li>
        </ol>
      </div>
    );
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
          {showPrices && state.data?.estimated_total != null ? <li>Estimativa: <b style={{ color: "var(--ink)" }}>{formatCurrency(state.data.estimated_total)}</b></li> : null}
        </ul>
      </div>
    );
  }

  const busyDays = new Set(busy[month] ?? []);
  const canNext = step === 0 ? true : step === 1 ? Boolean(date) : step === 2 ? adults + children > 0 : step === 3 ? contact.name.trim().length >= 2 && contact.whatsapp.replace(/\D/g, "").length >= 10 : true;
  const depositAmount = depositPercent != null ? Math.round(total * depositPercent) / 100 : null;
  const addonLines = lines.filter((l) => l.kind === "ADDON");
  const upd = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setContact((c) => ({ ...c, [k]: e.target.value }));

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
      {defaultSource && !known ? <input type="hidden" name="source" value={defaultSource} /> : <input type="hidden" name="source" value={contact.source} />}
      <input type="hidden" name="name" value={contact.name} />
      <input type="hidden" name="whatsapp" value={contact.whatsapp} />
      <input type="hidden" name="celebrant_name" value={contact.celebrant_name} />
      <input type="hidden" name="celebrant_birth_date" value={contact.celebrant_birth_date} />
      <input type="hidden" name="message" value={contact.message} />

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

      <div className="scallop rounded-b-3xl pt-7 px-5 pb-5 sm:px-8 space-y-3">
        {step === 0 ? (
          <>
            <h2 className="display font-extrabold text-2xl">Qual pacote?</h2>
            <div className="grid gap-2">
              {packages.map((p) => (
                <button type="button" key={p.id} onClick={() => choosePackage(p.id)} className={cn("text-left rounded-2xl border-2 p-4 transition", packageId === p.id ? "border-[var(--berry)] bg-white" : "border-[#ece7dc] bg-white/60 hover:border-[var(--berry)]/40")}>
                  <div className="flex items-center justify-between gap-3"><span className="display font-bold text-lg">{p.name}</span>{showPrices ? <span className="display font-extrabold text-lg" style={{ color: "var(--berry)" }}>{formatCurrency(p.base_price)}</span> : null}</div>
                  <p className="text-xs" style={{ color: "var(--muted-ink)" }}>{p.included_adults} adultos + {p.included_children} crianças inclusos{showPrices ? ` · extra ${formatCurrency(p.extra_adult_price)}/adulto, ${formatCurrency(p.extra_child_price)}/criança` : ""}</p>
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
            <p className="text-sm" style={{ color: "var(--muted-ink)" }}>Dias riscados já têm festa. Fazemos uma festa por dia.</p>
            <div className="mx-auto w-full max-w-sm space-y-1.5">
            <MonthPicker month={month} onMonthChange={setMonth} date={date} onDateChange={setDate} today={today} busy={busyDays} loading={loadingMonth} variant="public" />
            <div className="grid grid-cols-[150px_1fr] gap-3 items-center pt-2">
              <Field label="Início" htmlFor="wizard_time"><Input id="wizard_time" type="time" step={900} value={time} onChange={(e) => setTime(e.target.value || "15:00")} /></Field>
              <div className="text-sm pt-6" style={{ color: "var(--muted-ink)" }}>{date ? <>Festa em <b style={{ color: "var(--ink)" }}>{fmtDate(date)}</b>, das {time} às {addMinutes(time, durationMinutes)}</> : "Escolha um dia livre."}</div>
            </div>
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
                      <div className="min-w-0"><p className="font-bold">{a.name}</p><p className="text-xs" style={{ color: "var(--muted-ink)" }}>{[showPrices ? formatCurrency(a.price) : null, a.description].filter(Boolean).join(" · ")}</p></div>
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

            <Field label="Seu nome" htmlFor="name" error={fe.name}><Input id="name" value={contact.name} onChange={upd("name")} autoComplete="name" required /></Field>
            <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp}><Input id="whatsapp" value={contact.whatsapp} onChange={upd("whatsapp")} type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aniversariante" htmlFor="celebrant_name"><Input id="celebrant_name" value={contact.celebrant_name} onChange={upd("celebrant_name")} placeholder="Nome" /></Field>
              <Field label="Nascimento" htmlFor="celebrant_birth_date"><Input id="celebrant_birth_date" value={contact.celebrant_birth_date} onChange={upd("celebrant_birth_date")} type="date" /></Field>
            </div>
            {defaultSource && !known ? null : (
              <Field label="Como nos conheceu?" htmlFor="source">
                <Select id="source" value={contact.source} onChange={upd("source")}>
                  <option value="">Selecione</option>
                  {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Observações" htmlFor="message"><Textarea id="message" value={contact.message} onChange={upd("message")} placeholder="Tema, restrições, dúvidas..." className="min-h-16" /></Field>
          </>
        ) : null}
        {step === 4 ? (
          <>
            <h2 className="display font-extrabold text-2xl">Confira antes de enviar</h2>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt style={{ color: "var(--muted-ink)" }}>Pacote</dt><dd className="font-bold">{pkg ? pkg.name : "Sem pacote (personalizado)"}{pkg && showPrices ? ` · ${formatCurrency(pkg.base_price)}` : ""}</dd>
              <dt style={{ color: "var(--muted-ink)" }}>Data</dt><dd className="font-bold">{date ? `${fmtDate(date)}, das ${time} às ${addMinutes(time, durationMinutes)}` : "A combinar"}</dd>
              <dt style={{ color: "var(--muted-ink)" }}>Pessoas</dt><dd className="font-bold">{adults} adultos · {children} crianças{pkg && (adults > pkg.included_adults || children > pkg.included_children) ? <span className="font-normal" style={{ color: "var(--muted-ink)" }}> (com extras além do pacote)</span> : null}</dd>
              <dt style={{ color: "var(--muted-ink)" }}>Adicionais</dt><dd className="font-bold">{addonLines.length ? addonLines.map((l) => `${l.description} × ${l.quantity}`).join(", ") : "Nenhum"}</dd>
              <dt style={{ color: "var(--muted-ink)" }}>Contato</dt><dd className="font-bold">{contact.name} · {contact.whatsapp}</dd>
              {contact.celebrant_name ? <><dt style={{ color: "var(--muted-ink)" }}>Aniversariante</dt><dd className="font-bold">{contact.celebrant_name}</dd></> : null}
              {showPrices ? <><dt style={{ color: "var(--muted-ink)" }}>Total estimado</dt><dd className="display font-extrabold text-xl" style={{ color: "var(--berry)" }}>{formatCurrency(total)}</dd></> : null}
            </dl>
            {selfBooking && date ? (
              <div className="rounded-2xl p-4 text-sm space-y-1" style={{ background: "var(--paper-2)" }}>
                <p className="display font-bold text-lg">Como funciona a reserva</p>
                <p>Ao clicar em <b>Reservar esta data</b>, {fmtDate(date)} fica segura para você por <b>{validityHours} horas</b>.</p>
                <p>Nesse prazo você paga o sinal{depositAmount != null && showPrices ? <> de <b style={{ color: "var(--berry)" }}>{formatCurrency(depositAmount)}</b> ({depositPercent}%)</> : depositPercent != null ? <> de <b>{depositPercent}%</b></> : null} por Pix{depositLabel ? ` (${depositLabel.toLowerCase()})` : ""}. Sem o pagamento, a data volta a ficar livre automaticamente.</p>
                <p>Prefere só receber o valor e decidir depois? Use <b>Só o orçamento</b>.</p>
              </div>
            ) : (
              <p className="text-sm rounded-2xl p-4" style={{ background: "var(--paper-2)" }}>Enviamos o orçamento e a disponibilidade da data pelo seu WhatsApp. Enviar não reserva a data.</p>
            )}
            <button type="button" onClick={() => setStep(3)} className="text-sm font-bold underline-offset-4 hover:underline" style={{ color: "var(--berry)" }}>Corrigir algo</button>
          </>
        ) : null}
      </div>

      {/* Summary + nav */}
      <div className="sticky bottom-3 z-10 rounded-3xl p-3 sm:p-4 flex flex-wrap items-center gap-3 shadow-[0_12px_40px_rgba(27,31,58,0.35)]" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="flex-1 min-w-[12rem] text-sm" style={{ color: "#cfd2e6" }}>
          {showPrices ? <p><b className="display text-2xl text-white">{formatCurrency(total)}</b> estimado</p> : <p className="display text-lg text-white">Valor enviado no WhatsApp</p>}
          <p className="truncate">{pkg ? pkg.name : "Sem pacote"}{date ? ` · ${fmtDate(date)} ${time}` : ""} · {adults}A {children}C{lines.filter((l) => l.kind === "ADDON").length ? ` · ${lines.filter((l) => l.kind === "ADDON").length} adicional(is)` : ""}</p>
        </div>
        <div className="flex gap-2 ml-auto">
          {step > 0 ? <button type="button" onClick={() => setStep((s) => s - 1)} className="h-11 px-4 rounded-full font-bold ring-2 ring-inset ring-white/30 whitespace-nowrap">Voltar</button> : null}
          {step < STEPS.length - 1 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="h-11 px-5 rounded-full font-extrabold disabled:opacity-40 whitespace-nowrap" style={{ background: "var(--berry)", color: "#fff" }}>Continuar</button>
          ) : selfBooking && date ? (
            <>
              <SubmitButton name="mode" value="lead" size="md" variant="ghost" className="rounded-full font-bold text-white ring-2 ring-inset ring-white/30 hover:bg-white/10 whitespace-nowrap" pendingText="Enviando...">Só orçamento</SubmitButton>
              <SubmitButton name="mode" value="reserve" size="lg" className="rounded-full font-extrabold whitespace-nowrap" style={{ background: "var(--berry)" }} pendingText="Reservando...">Reservar esta data</SubmitButton>
            </>
          ) : (
            <SubmitButton name="mode" value="lead" size="lg" className="rounded-full font-extrabold whitespace-nowrap" style={{ background: "var(--berry)" }} pendingText="Enviando...">Enviar pedido</SubmitButton>
          )}
        </div>
      </div>
    </form>
  );
}
