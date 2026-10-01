"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, UserPlus, ShoppingBag, Minus, Plus } from "lucide-react";
import { doorCheckIn, doorAddGuest, doorAddExtra, doorRegisterPayment } from "@/lib/actions/public";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { CopyButton } from "@/components/ui/copy-button";
import { cn, formatCurrency } from "@/lib/utils";

type Guest = { id: string; name: string; adults: number; children: number; checked_in_at: string | null; checked_in_adults: number; checked_in_children: number; source: string; notes: string | null };
type Extra = { id: string; description: string; quantity: number; unit_price: number; total: number; created_at: string };
type Addon = { id: string; name: string; price: number };

type Account = { extrasTotal: number; extrasPaid: number; extrasOpen: number; pixKey: string | null; payload: string | null; qr: string | null; txid: string };

export function DoorBoard({ token, account, guests, extras, extrasTotalLabel, addons }: { token: string; account: Account; guests: Guest[]; extras: Extra[]; extrasTotalLabel: string; addons: Addon[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"pending" | "arrived" | "extras">("pending");
  const list = useMemo(() => guests.filter((g) => g.name.toLowerCase().includes(q.trim().toLowerCase())), [guests, q]);
  const pending = list.filter((g) => !g.checked_in_at);
  const arrived = list.filter((g) => g.checked_in_at);
  const expected = guests.reduce((a, g) => a + g.adults + g.children, 0);
  const present = guests.reduce((a, g) => a + g.checked_in_adults + g.checked_in_children, 0);

  // Refresh every 20s so two phones at the door stay in sync.
  useEffect(() => { const t = setInterval(() => router.refresh(), 20_000); return () => clearInterval(t); }, [router]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-surface border border-border p-3"><p className="text-xs text-muted">Presentes</p><p className="text-2xl font-semibold text-emerald-700">{present}</p></div>
        <div className="rounded-2xl bg-surface border border-border p-3"><p className="text-xs text-muted">Faltam</p><p className="text-2xl font-semibold text-amber-700">{Math.max(expected - present, 0)}</p></div>
        <div className="rounded-2xl bg-surface border border-border p-3"><p className="text-xs text-muted">Confirmados</p><p className="text-2xl font-semibold">{expected}</p></div>
      </div>

      <div className="flex rounded-xl border border-border bg-surface p-0.5 text-sm">
        {([["pending", `Aguardando (${guests.filter((g) => !g.checked_in_at).length})`], ["arrived", `Chegaram (${guests.filter((g) => g.checked_in_at).length})`], ["extras", `Pedidos (${extras.length})`]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn("flex-1 py-2 rounded-lg font-medium", tab === k ? "bg-brand text-brand-fg" : "text-muted")}>{l}</button>
        ))}
      </div>

      {tab !== "extras" ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="pl-9" />
          </div>
          <ul className="space-y-2">
            {(tab === "pending" ? pending : arrived).map((g) => <GuestRow key={g.id} token={token} guest={g} onDone={() => router.refresh()} />)}
            {(tab === "pending" ? pending : arrived).length === 0 ? <li className="text-sm text-muted text-center py-6">{tab === "pending" ? "Ninguém aguardando." : "Ninguém chegou ainda."}</li> : null}
          </ul>
          <AddGuestForm token={token} onDone={() => router.refresh()} />
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between mb-2"><p className="font-medium">Pedidos extras</p><span className="font-semibold">{extrasTotalLabel}</span></div>
            {extras.length === 0 ? <p className="text-sm text-muted">Nenhum pedido ainda.</p> : (
              <ul className="divide-y divide-border">
                {extras.map((x) => <li key={x.id} className="flex justify-between gap-3 py-2 text-sm"><span>{x.description} × {x.quantity}</span><span className="font-medium">{formatCurrency(x.total)}</span></li>)}
              </ul>
            )}
          </div>
          <AddExtraForm token={token} addons={addons} onDone={() => router.refresh()} />
          <CloseAccount token={token} account={account} onDone={() => router.refresh()} />
        </>
      )}
    </div>
  );
}

function GuestRow({ token, guest, onDone }: { token: string; guest: Guest; onDone: () => void }) {
  const [state, action] = useActionState(doorCheckIn, undefined);
  const [adults, setAdults] = useState(guest.checked_in_at ? guest.checked_in_adults : guest.adults);
  const [children, setChildren] = useState(guest.checked_in_at ? guest.checked_in_children : guest.children);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!state?.ok) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the inline editor after a successful save
    setOpen(false);
    onDone();
  }, [state, onDone]);
  const arrived = Boolean(guest.checked_in_at);

  return (
    <li className={cn("rounded-2xl border bg-surface p-3", arrived ? "border-emerald-200" : "border-border")}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate">{arrived ? <Check className="inline h-4 w-4 text-emerald-600 mr-1" /> : null}{guest.name}</p>
          <p className="text-xs text-muted">Confirmou {guest.adults}A {guest.children}C{arrived ? ` · chegaram ${guest.checked_in_adults}A ${guest.checked_in_children}C` : ""}{guest.source === "DOOR" ? " · extra" : ""}{guest.notes ? ` · ${guest.notes}` : ""}</p>
        </div>
        {!open ? (
          <div className="flex gap-1 shrink-0">
            {!arrived ? (
              <form action={action}>
                <input type="hidden" name="token" value={token} /><input type="hidden" name="guest_id" value={guest.id} />
                <input type="hidden" name="checked_in_adults" value={guest.adults} /><input type="hidden" name="checked_in_children" value={guest.children} />
                <SubmitButton size="sm">Chegou</SubmitButton>
              </form>
            ) : null}
            <button type="button" onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg border border-border text-sm">{arrived ? "Ajustar" : "Parcial"}</button>
          </div>
        ) : null}
      </div>
      {open ? (
        <form action={action} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="token" value={token} /><input type="hidden" name="guest_id" value={guest.id} />
          <Counter label="Adultos" name="checked_in_adults" value={adults} onChange={setAdults} />
          <Counter label="Crianças" name="checked_in_children" value={children} onChange={setChildren} />
          <SubmitButton size="sm" className="ml-auto">Salvar</SubmitButton>
          <button type="button" onClick={() => setOpen(false)} className="h-9 px-2 text-sm text-muted">Cancelar</button>
        </form>
      ) : null}
      {state && !state.ok ? <p className="text-xs text-red-600 mt-2">{state.error}</p> : null}
    </li>
  );
}

function Counter({ label, name, value, onChange }: { label: string; name: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-xs text-muted mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(value - 1, 0))} className="h-9 w-9 rounded-lg border border-border grid place-items-center" aria-label={`Menos ${label}`}><Minus className="h-4 w-4" /></button>
        <input name={name} value={value} readOnly className="w-10 h-9 text-center rounded-lg border border-border bg-surface" />
        <button type="button" onClick={() => onChange(value + 1)} className="h-9 w-9 rounded-lg border border-border grid place-items-center" aria-label={`Mais ${label}`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function AddGuestForm({ token, onDone }: { token: string; onDone: () => void }) {
  const [state, action] = useActionState(doorAddGuest, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); onDone(); } }, [state, onDone]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-dashed border-border bg-surface p-4 space-y-3">
      <p className="font-medium inline-flex items-center gap-1.5"><UserPlus className="h-4 w-4" /> Convidado extra (chegou sem confirmar)</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <div className="grid grid-cols-[1fr_72px_72px] gap-2 items-end">
        <Field label="Nome" htmlFor="door_name" error={fe.name}><Input id="door_name" name="name" required /></Field>
        <Field label="Adultos" htmlFor="door_adults" error={fe.adults}><Input id="door_adults" name="adults" type="number" inputMode="numeric" min={0} defaultValue={1} /></Field>
        <Field label="Crianças" htmlFor="door_children"><Input id="door_children" name="children" type="number" inputMode="numeric" min={0} defaultValue={0} /></Field>
      </div>
      <SubmitButton size="sm" variant="secondary">Adicionar e marcar chegada</SubmitButton>
    </form>
  );
}

function AddExtraForm({ token, addons, onDone }: { token: string; addons: Addon[]; onDone: () => void }) {
  const [state, action] = useActionState(doorAddExtra, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [addonId, setAddonId] = useState("");
  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.reset();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the catalog select after a successful save
    setAddonId("");
    onDone();
  }, [state, onDone]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const addon = addons.find((a) => a.id === addonId);
  return (
    <form ref={ref} action={action} className="rounded-2xl border border-dashed border-border bg-surface p-4 space-y-3">
      <p className="font-medium inline-flex items-center gap-1.5"><ShoppingBag className="h-4 w-4" /> Registrar pedido na hora</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      {addons.length > 0 ? (
        <Field label="Item do catálogo" htmlFor="door_addon">
          <Select id="door_addon" name="addon_id" value={addonId} onChange={(e) => setAddonId(e.target.value)}>
            <option value="">Item livre</option>
            {addons.map((a) => <option key={a.id} value={a.id}>{a.name} · {formatCurrency(a.price)}</option>)}
          </Select>
        </Field>
      ) : null}
      {!addon ? (
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <Field label="Descrição" htmlFor="door_desc" error={fe.description}><Input id="door_desc" name="description" placeholder="Ex.: 10 cervejas" /></Field>
          <Field label="Valor unit. (R$)" htmlFor="door_price" error={fe.unit_price}><Input id="door_price" name="unit_price" inputMode="decimal" placeholder="0,00" /></Field>
        </div>
      ) : null}
      <Field label="Quantidade" htmlFor="door_qty" error={fe.quantity}><Input id="door_qty" name="quantity" inputMode="decimal" defaultValue={1} className="w-28" /></Field>
      <SubmitButton size="sm" variant="secondary">Registrar pedido</SubmitButton>
    </form>
  );
}

/** "Fechar conta": what the extras add up to, what is still open, Pix QR for the exact amount, and one-tap "received". */
function CloseAccount({ token, account, onDone }: { token: string; account: Account; onDone: () => void }) {
  const [state, action] = useActionState(doorRegisterPayment, undefined);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  if (account.extrasTotal <= 0) return null;
  const settled = account.extrasOpen <= 0.005;
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${settled ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Fechar conta</p>
        <span className={`font-semibold ${settled ? "text-emerald-700" : "text-amber-800"}`}>{settled ? "Extras quitados" : `Falta ${formatCurrency(account.extrasOpen)}`}</span>
      </div>
      <p className="text-xs text-muted">Extras {formatCurrency(account.extrasTotal)} · já pago {formatCurrency(account.extrasPaid)}</p>
      {!settled ? (
        <>
          {account.payload ? (
            <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {account.qr ? <img src={account.qr} alt="QR Code Pix" className="h-[120px] w-[120px] rounded-xl bg-white p-1 border border-border" /> : null}
              <div className="text-sm space-y-1">
                <p>Pix de <b>{formatCurrency(account.extrasOpen)}</b> · chave <code className="rounded bg-white px-1.5 py-0.5">{account.pixKey}</code></p>
                <p className="text-xs text-muted">Identificador {account.txid}. Confira no extrato antes de marcar como recebido.</p>
                <CopyButton text={account.payload} label="Copiar Pix copia e cola" />
              </div>
            </div>
          ) : <p className="text-xs text-muted">Buffet sem chave Pix cadastrada: receba em dinheiro ou cartão.</p>}
          {state && !state.ok ? <Alert>{state.error}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            {(["PIX", "CASH", "CARD"] as const).map((m) => (
              <form key={m} action={action}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="amount" value={account.extrasOpen.toFixed(2).replace(".", ",")} />
                <input type="hidden" name="method" value={m} />
                <SubmitButton size="sm" variant={m === "PIX" ? "primary" : "outline"} pendingText="Registrando...">Recebido · {m === "PIX" ? "Pix" : m === "CASH" ? "Dinheiro" : "Cartão"}</SubmitButton>
              </form>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
