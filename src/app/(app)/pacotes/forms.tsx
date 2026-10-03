"use client";

import { ImageInput } from "@/components/ui/image-input";

import { useActionState, useEffect } from "react";
import { savePackage, saveAddon, saveTheme } from "@/lib/actions/settings";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

type Pkg = { id: string; name: string; base_price: number | string; included_adults: number; included_children: number; extra_adult_price: number | string; extra_child_price: number | string; description: string | null };
type Addon = { id: string; name: string; price: number | string; description: string | null };

export function PackageForm({ pkg, onSaved }: { pkg?: Pkg; onSaved?: () => void }) {
  const [state, action] = useActionState(savePackage, undefined);
  useEffect(() => { if (state?.ok) onSaved?.(); }, [state, onSaved]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const k = pkg?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <Field label="Nome" htmlFor={`pkg_name_${k}`} error={fe.name}><Input id={`pkg_name_${k}`} name="name" defaultValue={pkg?.name ?? ""} required /></Field>
      <Field label="Preço-base (R$)" htmlFor={`pkg_price_${k}`} error={fe.base_price}><Input id={`pkg_price_${k}`} name="base_price" inputMode="decimal" defaultValue={pkg ? Number(pkg.base_price) : ""} required /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Adultos incluídos" htmlFor={`pkg_ia_${k}`} error={fe.included_adults}><Input id={`pkg_ia_${k}`} name="included_adults" type="number" min={0} defaultValue={pkg?.included_adults ?? 0} /></Field>
        <Field label="Crianças incluídas" htmlFor={`pkg_ic_${k}`} error={fe.included_children}><Input id={`pkg_ic_${k}`} name="included_children" type="number" min={0} defaultValue={pkg?.included_children ?? 0} /></Field>
        <Field label="R$ por adulto extra" htmlFor={`pkg_ea_${k}`} error={fe.extra_adult_price}><Input id={`pkg_ea_${k}`} name="extra_adult_price" inputMode="decimal" defaultValue={pkg ? Number(pkg.extra_adult_price) : 0} /></Field>
        <Field label="R$ por criança extra" htmlFor={`pkg_ec_${k}`} error={fe.extra_child_price}><Input id={`pkg_ec_${k}`} name="extra_child_price" inputMode="decimal" defaultValue={pkg ? Number(pkg.extra_child_price) : 0} /></Field>
      </div>
      <Field label="Descrição" htmlFor={`pkg_desc_${k}`}><Textarea id={`pkg_desc_${k}`} name="description" defaultValue={pkg?.description ?? ""} className="min-h-16" placeholder="O que está incluso" /></Field>
      <SubmitButton size="sm">{pkg ? "Salvar" : "Criar pacote"}</SubmitButton>
    </form>
  );
}

export function AddonForm({ addon, onSaved }: { addon?: Addon; onSaved?: () => void }) {
  const [state, action] = useActionState(saveAddon, undefined);
  useEffect(() => { if (state?.ok) onSaved?.(); }, [state, onSaved]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const k = addon?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {addon ? <input type="hidden" name="id" value={addon.id} /> : null}
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <Field label="Nome" htmlFor={`addon_name_${k}`} error={fe.name}><Input id={`addon_name_${k}`} name="name" defaultValue={addon?.name ?? ""} required /></Field>
        <Field label="Preço" htmlFor={`addon_price_${k}`} error={fe.price}><Input id={`addon_price_${k}`} name="price" inputMode="decimal" defaultValue={addon ? Number(addon.price) : ""} required /></Field>
      </div>
      <Field label="Descrição" htmlFor={`addon_desc_${k}`}><Input id={`addon_desc_${k}`} name="description" defaultValue={addon?.description ?? ""} /></Field>
      <SubmitButton size="sm">{addon ? "Salvar" : "Criar adicional"}</SubmitButton>
    </form>
  );
}

type Theme = { id: string; name: string; description: string | null; photo_url: string | null; sort_order: number };

export function ThemeForm({ theme, onSaved }: { theme?: Theme; onSaved?: () => void }) {
  const [state, action] = useActionState(saveTheme, undefined);
  useEffect(() => { if (state?.ok) onSaved?.(); }, [state, onSaved]);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const k = theme?.id ?? "new";
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {theme ? <input type="hidden" name="id" value={theme.id} /> : null}
      <Field label="Nome do tema" htmlFor={`theme_name_${k}`} error={fe.name}><Input id={`theme_name_${k}`} name="name" defaultValue={theme?.name ?? ""} placeholder="Ex.: Safári" required /></Field>
      <Field label="Descrição" htmlFor={`theme_desc_${k}`}><Textarea id={`theme_desc_${k}`} name="description" defaultValue={theme?.description ?? ""} className="min-h-16" placeholder="O que entra na decoração" /></Field>
      <div className="grid grid-cols-[1fr_90px] gap-2 items-end">
        <Field label={theme?.photo_url ? "Trocar foto" : "Foto"} htmlFor={`theme_photo_${k}`} hint="JPG, PNG ou WebP até 8MB">
          <ImageInput id={`theme_photo_${k}`} name="photo" />
        </Field>
        <Field label="Ordem" htmlFor={`theme_order_${k}`}><Input id={`theme_order_${k}`} name="sort_order" type="number" min={0} defaultValue={theme?.sort_order ?? 0} /></Field>
      </div>
      <SubmitButton size="sm" pendingText="Salvando...">{theme ? "Salvar" : "Criar tema"}</SubmitButton>
    </form>
  );
}
