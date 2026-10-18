import { notFound } from "next/navigation";
import { CheckSquare, Square, X } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { addTodo, deleteTodo, toggleTodo } from "@/lib/actions/admin-todos";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";
import { PendingButton } from "@/components/ui/pending-button";
import { SelectMenu } from "@/components/ui/select-menu";
import Link from "next/link";
import { PriorityInput } from "./priority-input";

export const metadata = { title: "Pendências · Admin Komyx" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { key: "voce", title: "Depende do Thiago", subtitle: "Contas, senhas e decisões" },
  { key: "app", title: "App", subtitle: "Próxima versão na loja" },
  { key: "produto", title: "Produto", subtitle: "Web e app" },
] as const;

type Todo = { id: string; section: string; title: string; sort_order: number; priority: number | null; done_at: string | null };

const SECTION_LABEL: Record<string, string> = { voce: "Thiago", app: "App", produto: "Produto" };

function TodoRow({ todo, showSection = false }: { todo: Todo; showSection?: boolean }) {
  const done = Boolean(todo.done_at);
  return (
    <li className="group flex items-start gap-2 py-2">
      <form action={toggleTodo}>
        <input type="hidden" name="id" value={todo.id} />
        <PendingButton type="submit" aria-label={done ? "Reabrir" : "Marcar como feito"} className="mt-0.5 text-muted hover:text-brand">
          {done ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5" />}
        </PendingButton>
      </form>
      {done ? null : <PriorityInput key={`${todo.id}-${todo.priority}`} id={todo.id} priority={todo.priority} />}
      <p className={done ? "flex-1 text-sm text-muted line-through" : "flex-1 text-sm"}>
        {showSection ? <span className="mr-2 inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-muted">{SECTION_LABEL[todo.section] ?? todo.section}</span> : null}
        {todo.title}
        {done && todo.done_at ? <span className="ml-2 no-underline text-xs">{formatDate(todo.done_at)}</span> : null}
      </p>
      <form action={deleteTodo}>
        <input type="hidden" name="id" value={todo.id} />
        <PendingButton type="submit" aria-label="Apagar" className="mt-0.5 text-stone-300 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-600"><X className="h-4 w-4" /></PendingButton>
      </form>
    </li>
  );
}

// The official list lives in staging (teste.komyx.com.br); production has none. Local shows its own copy for development.

export default async function AdminTodosPage({ searchParams }: PageProps<"/admin/pendencias">) {
  const byPriority = (await searchParams).ordem === "prioridade";
  if (process.env.VERCEL_ENV === "production") notFound();
  const admin = createAdminClient();
  const { data } = await admin.from("platform_todos").select("id, section, title, sort_order, priority, done_at").order("sort_order").order("created_at");
  const todos = (data ?? []) as Todo[];
  const open = todos.filter((t) => !t.done_at);
  const sectionRank = (key: string) => SECTIONS.findIndex((s) => s.key === key);
  // No priority goes last; ties keep the section order, then the list order.
  const ranked = [...open].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || sectionRank(a.section) - sectionRank(b.section) || a.sort_order - b.sort_order);
  const done = todos.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 30);

  return (
    <>
      <PageHeader title="Pendências" subtitle={`${open.length} em aberto · prioridade 1 = mais urgente`} />
      <PageBody className="space-y-4 max-w-4xl">
        <div className="inline-flex rounded-xl border border-border bg-surface p-1 text-sm" role="group" aria-label="Ordenar">
          <Link href="/admin/pendencias" aria-current={byPriority ? undefined : "page"} className={byPriority ? "rounded-lg px-3 py-1.5 text-muted hover:text-foreground" : "rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white"}>Por seção</Link>
          <Link href="/admin/pendencias?ordem=prioridade" aria-current={byPriority ? "page" : undefined} className={byPriority ? "rounded-lg bg-stone-900 px-3 py-1.5 font-medium text-white" : "rounded-lg px-3 py-1.5 text-muted hover:text-foreground"}>Por prioridade</Link>
        </div>
        {byPriority ? (
          <Card>
            <CardHeader title={`Em aberto · ${open.length}`} subtitle="Todas as seções, da prioridade 1 para baixo; sem número vai para o fim" />
            <CardBody className="space-y-2">
              {ranked.length ? <ul className="divide-y divide-border">{ranked.map((t) => <TodoRow key={t.id} todo={t} showSection />)}</ul> : <p className="text-sm text-muted">Nada aqui.</p>}
              <form action={addTodo} className="flex gap-2 pt-1">
                <SelectMenu name="section" defaultValue="produto" options={SECTIONS.map((s) => ({ value: s.key, label: SECTION_LABEL[s.key] }))} size="sm" className="w-32 shrink-0" />
                <Input name="title" placeholder="Nova pendência" required maxLength={500} className="h-10" />
                <SubmitButton size="sm" variant="outline">Adicionar</SubmitButton>
              </form>
            </CardBody>
          </Card>
        ) : SECTIONS.map((s) => {
          const items = open.filter((t) => t.section === s.key);
          return (
            <Card key={s.key}>
              <CardHeader title={`${s.title} · ${items.length}`} subtitle={s.subtitle} />
              <CardBody className="space-y-2">
                {items.length ? <ul className="divide-y divide-border">{items.map((t) => <TodoRow key={t.id} todo={t} />)}</ul> : <p className="text-sm text-muted">Nada aqui.</p>}
                <form action={addTodo} className="flex gap-2 pt-1">
                  <input type="hidden" name="section" value={s.key} />
                  <Input name="title" placeholder="Nova pendência" required maxLength={500} className="h-10" />
                  <SubmitButton size="sm" variant="outline">Adicionar</SubmitButton>
                </form>
              </CardBody>
            </Card>
          );
        })}
        {done.length ? (
          <Card>
            <CardHeader title="Feito" subtitle="Os 30 mais recentes; clique para reabrir" />
            <CardBody><ul className="divide-y divide-border">{done.map((t) => <TodoRow key={t.id} todo={t} />)}</ul></CardBody>
          </Card>
        ) : null}
      </PageBody>
    </>
  );
}
