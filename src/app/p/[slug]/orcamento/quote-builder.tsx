"use client";

import { useActionState, useMemo, useState } from "react";
import { submitPublicRequest } from "@/lib/actions/public";
import type { ActionResult } from "@/lib/action-result";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { cn, formatCurrency } from "@/lib/utils";
import { buildQuoteLines, sumLines, LEAD_SOURCES, type PackagePricing, type AddonPricing } from "@/lib/pricing";

type Addon = AddonPricing & { description: string | null };

export function QuoteBuilder({ slug, packages, addons, defaultSource, preselectedPackage }: { slug: string; packages: (PackagePricing & { description: string | null })[]; addons: Addon[]; defaultSource: string; preselectedPackage: string }) {
  const [state, action] = useActionState<ActionResult<{ estimated_total: number | null }> | undefined, FormData>(submitPublicRequest, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const initial = packages.find((p) => p.id === preselectedPackage) ?? packages[0] ?? null;
  const [packageId, setPackageId] = useState(initial?.id ?? "");
  const [adults, setAdults] = useState(initial?.included_adults ?? 10);
  const [children, setChildren] = useState(initial?.included_children ?? 10);
  const [qty, setQty] = useState<Record<string, number>>({});
  const pkg = packages.find((p) => p.id === packageId) ?? null;

  const lines = useMemo(() => buildQuoteLines(pkg, adults, children, addons.filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon: a, quantity: qty[a.id] }))), [pkg, adults, children, addons, qty]);
  const total = sumLines(lines);
  const addonsJson = JSON.stringify(addons.filter((a) => (qty[a.id] ?? 0) > 0).map((a) => ({ addon_id: a.id, quantity: qty[a.id] })));
  const known = LEAD_SOURCES.some((s) => s.value === defaultSource);

  function choose(id: string) {
    setPackageId(id);
    const p = packages.find((x) => x.id === id);
    if (p) { setAdults(p.included_adults); setChildren(p.included_children); }
  }

  if (state?.ok) {
    return (
      <Card><CardBody className="pt-5 space-y-2">
        <Alert tone="success">{state.message}</Alert>
        {state.data?.estimated_total != null ? <p className="text-sm text-muted">Estimativa enviada: <b className="text-foreground">{formatCurrency(state.data.estimated_total)}</b></p> : null}
      </CardBody></Card>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="package_id" value={packageId} />
      <input type="hidden" name="addons" value={addonsJson} />
      {defaultSource && !known ? <input type="hidden" name="source" value={defaultSource} /> : null}

      <Card>
        <CardBody className="pt-4 space-y-3">
          <h2 className="font-semibold">1. Escolha o pacote</h2>
          <div className="grid gap-2">
            {packages.map((p) => (
              <button type="button" key={p.id} onClick={() => choose(p.id)} className={cn("text-left rounded-xl border p-3 transition", packageId === p.id ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-brand/40")}>
                <div className="flex items-center justify-between gap-3"><span className="font-medium">{p.name}</span><span className="font-semibold text-brand">{formatCurrency(p.base_price)}</span></div>
                <p className="text-xs text-muted">{p.included_adults} adultos + {p.included_children} crianças inclusos · extra {formatCurrency(p.extra_adult_price)}/adulto, {formatCurrency(p.extra_child_price)}/criança</p>
                {p.description ? <p className="text-xs text-muted mt-1">{p.description}</p> : null}
              </button>
            ))}
            <button type="button" onClick={() => setPackageId("")} className={cn("text-left rounded-xl border p-3", packageId === "" ? "border-brand bg-brand-soft" : "border-border bg-surface")}>
              <span className="font-medium">Sem pacote</span><p className="text-xs text-muted">Quero algo personalizado; o buffet monta comigo.</p>
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4 space-y-3">
          <h2 className="font-semibold">2. Quantas pessoas?</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adultos" htmlFor="adults" error={fe.adults}><Input id="adults" name="adults" type="number" inputMode="numeric" min={0} value={adults} onChange={(e) => setAdults(Number(e.target.value || 0))} /></Field>
            <Field label="Crianças" htmlFor="children" error={fe.children}><Input id="children" name="children" type="number" inputMode="numeric" min={0} value={children} onChange={(e) => setChildren(Number(e.target.value || 0))} /></Field>
          </div>
          {pkg && (adults > pkg.included_adults || children > pkg.included_children) ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Acima do incluso no pacote: {Math.max(adults - pkg.included_adults, 0)} adulto(s) e {Math.max(children - pkg.included_children, 0)} criança(s) extras entram no valor.</p>
          ) : null}
        </CardBody>
      </Card>

      {addons.length > 0 ? (
        <Card>
          <CardBody className="pt-4 space-y-3">
            <h2 className="font-semibold">3. Adicionais <span className="text-muted font-normal text-sm">(opcional)</span></h2>
            <ul className="divide-y divide-border">
              {addons.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0"><p className="font-medium">{a.name}</p><p className="text-xs text-muted">{formatCurrency(a.price)}{a.description ? ` · ${a.description}` : ""}</p></div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Menos" onClick={() => setQty((q) => ({ ...q, [a.id]: Math.max((q[a.id] ?? 0) - 1, 0) }))} className="h-9 w-9 rounded-lg border border-border">−</button>
                    <span className="w-8 text-center font-medium">{qty[a.id] ?? 0}</span>
                    <button type="button" aria-label="Mais" onClick={() => setQty((q) => ({ ...q, [a.id]: (q[a.id] ?? 0) + 1 }))} className="h-9 w-9 rounded-lg border border-border">+</button>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <Card className="border-brand/40">
        <CardBody className="pt-4 space-y-2">
          <h2 className="font-semibold">Estimativa</h2>
          {lines.length === 0 ? <p className="text-sm text-muted">Escolha um pacote ou adicionais para ver o valor.</p> : (
            <ul className="text-sm space-y-1">
              {lines.map((l, i) => <li key={i} className="flex justify-between gap-3"><span className="text-muted">{l.description}{l.quantity !== 1 ? ` × ${l.quantity}` : ""}</span><span>{formatCurrency(l.quantity * l.unit_price)}</span></li>)}
            </ul>
          )}
          <div className="flex justify-between text-lg font-semibold border-t border-border pt-2"><span>Total estimado</span><span>{formatCurrency(total)}</span></div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="pt-4 space-y-3">
          <h2 className="font-semibold">4. Seus dados</h2>
          <Field label="Seu nome" htmlFor="name" error={fe.name}><Input id="name" name="name" autoComplete="name" required /></Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={fe.whatsapp}><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data desejada" htmlFor="desired_date" error={fe.desired_date}><Input id="desired_date" name="desired_date" type="date" /></Field>
            <Field label="Horário" htmlFor="desired_time"><Input id="desired_time" name="desired_time" type="time" step={900} /></Field>
          </div>
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
          <SubmitButton size="lg" className="w-full" pendingText="Enviando...">Enviar orçamento para o buffet</SubmitButton>
        </CardBody>
      </Card>
    </form>
  );
}
