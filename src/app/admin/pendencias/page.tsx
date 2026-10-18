import { CheckSquare, Square, X } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { addTodo, deleteTodo, toggleTodo } from "@/lib/actions/admin-todos";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/utils";
import { PendingButton } from "@/components/ui/pending-button";
import { buttonClass } from "@/components/ui/button";

export const metadata = { title: "Pendências · Admin Komyx" };
export const dynamic = "force-dynamic";

const SECTIONS = [
  { key: "voce", title: "Depende do Thiago", subtitle: "Contas, senhas e decisões" },
  { key: "app", title: "App", subtitle: "Próxima versão na loja" },
  { key: "produto", title: "Produto", subtitle: "Web e app" },
] as const;

type Todo = { id: string; section: string; title: string; sort_order: number; done_at: string | null };

function TodoRow({ todo }: { todo: Todo }) {
  const done = Boolean(todo.done_at);
  return (
    <li className="group flex items-start gap-2 py-2">
      <form action={toggleTodo}>
        <input type="hidden" name="id" value={todo.id} />
        <PendingButton type="submit" aria-label={done ? "Reabrir" : "Marcar como feito"} className="mt-0.5 text-muted hover:text-brand">
          {done ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5" />}
        </PendingButton>
      </form>
      <p className={done ? "flex-1 text-sm text-muted line-through" : "flex-1 text-sm"}>
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

// The official list lives in production; local and staging only have the old copy from the migration.
const OFFICIAL_URL = "https://www.komyx.com.br/admin/pendencias";

export default async function AdminTodosPage() {
  if (process.env.VERCEL_ENV !== "production") {
    return (
      <>
        <PageHeader title="Pendências" subtitle="A lista oficial fica em produção" />
        <PageBody className="max-w-2xl">
          <Card>
            <CardBody className="space-y-3 pt-5">
              <p className="text-sm">Este ambiente ({process.env.VERCEL_ENV === "preview" ? "staging" : "local"}) tem só uma cópia antiga da lista. Para não confundir, ela não aparece aqui: as pendências são atualizadas em produção.</p>
              <a href={OFFICIAL_URL} target="_blank" rel="noopener" className={buttonClass("primary", "md")}>Abrir a lista oficial</a>
            </CardBody>
          </Card>
        </PageBody>
      </>
    );
  }
  const admin = createAdminClient();
  const { data } = await admin.from("platform_todos").select("id, section, title, sort_order, done_at").order("sort_order").order("created_at");
  const todos = (data ?? []) as Todo[];
  const open = todos.filter((t) => !t.done_at);
  const done = todos.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 30);

  return (
    <>
      <PageHeader title="Pendências" subtitle={`${open.length} em aberto`} />
      <PageBody className="space-y-4 max-w-4xl">
        {SECTIONS.map((s) => {
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
