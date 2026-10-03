"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteMenuGroup, saveMenuGroup } from "@/lib/actions/menu";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import type { MenuGroup } from "@/lib/menu";

function GroupForm({ packageId, group, index, onDone }: { packageId: string; group?: MenuGroup; index: number; onDone?: () => void }) {
  const [state, action] = useActionState(saveMenuGroup, undefined);
  const [mode, setMode] = useState<"all" | "n">(group?.choose_count == null ? (group ? "all" : "n") : "n");
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  const k = group?.id ?? `new-${packageId}`;
  return (
    <form action={action} className="rounded-xl border border-border bg-stone-50/60 p-3 space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {group ? <input type="hidden" name="id" value={group.id} /> : null}
      <input type="hidden" name="package_id" value={packageId} />
      <input type="hidden" name="sort_order" value={group?.sort_order ?? index} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Grupo" htmlFor={`mg_name_${k}`} error={fe.name}><Input id={`mg_name_${k}`} name="name" defaultValue={group?.name ?? ""} placeholder="Ex.: Salgados" required /></Field>
        <Field label="Cliente escolhe" htmlFor={`mg_mode_${k}`}>
          <select id={`mg_mode_${k}`} name="choose_mode" value={mode} onChange={(e) => setMode(e.target.value as "all" | "n")} className="h-10 rounded-xl border border-border bg-white px-3 text-sm">
            <option value="n">alguns itens</option>
            <option value="all">tudo incluído</option>
          </select>
        </Field>
        <Field label="Quantos" htmlFor={`mg_count_${k}`} error={fe.choose_count}>
          <Input id={`mg_count_${k}`} name="choose_count" type="number" min={1} max={50} defaultValue={group?.choose_count ?? 3} disabled={mode === "all"} className="w-24" />
        </Field>
      </div>
      <Field label="Itens (um por linha)" htmlFor={`mg_items_${k}`} hint={mode === "n" ? "O cliente escolhe a quantidade acima dentre estes." : "Todos entram no pacote."}>
        <Textarea id={`mg_items_${k}`} name="items" defaultValue={group?.items.map((i) => i.name).join("\n") ?? ""} className="min-h-24 font-mono text-sm" placeholder={"Coxinha\nKibe\nEsfiha\nBolinha de queijo\nEnroladinho de salsicha\nPastel"} />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <SubmitButton size="sm" onClick={onDone ? () => setTimeout(onDone, 800) : undefined}>{group ? "Salvar grupo" : "Criar grupo"}</SubmitButton>
        {group ? (
          <button type="submit" formAction={deleteMenuGroup} formNoValidate onClick={(e) => { if (!confirm(`Remover o grupo "${group.name}" e seus itens?`)) e.preventDefault(); }} className="inline-flex items-center gap-1 text-xs text-muted hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /> Remover grupo</button>
        ) : <button type="button" onClick={onDone} className="text-xs text-muted">Cancelar</button>}
      </div>
    </form>
  );
}

/** Cardápio do pacote: grupos (Salgados, Docinhos, Bebidas…) e quantos itens o cliente escolhe em cada um. */
export function PackageMenuEditor({ packageId, groups }: { packageId: string; groups: MenuGroup[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Cardápio do pacote</p>
          <p className="text-xs text-muted">O que vem incluído e o que o cliente escolhe. Aparece no orçamento, no contrato e no app do cliente.</p>
        </div>
        {!adding ? <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-medium text-brand"><Plus className="h-3.5 w-3.5" /> Grupo</button> : null}
      </div>
      {groups.map((g, i) => <GroupForm key={g.id} packageId={packageId} group={g} index={i} />)}
      {adding ? <GroupForm packageId={packageId} index={groups.length} onDone={() => setAdding(false)} /> : null}
      {!groups.length && !adding ? <p className="text-xs text-muted">Nenhum grupo ainda. Ex.: Salgados (escolhe 3 de 6), Docinhos (escolhe 3 de 6), Bebidas (tudo incluído).</p> : null}
    </div>
  );
}
