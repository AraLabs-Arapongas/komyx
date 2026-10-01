import Link from "next/link";
import { Cake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { mutePromo } from "@/lib/actions/celebrants";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { eventTitle } from "@/components/events/event-card";
import { formatDate, toDateKey } from "@/lib/utils";
import { PromoMessage } from "./promo-message";

export const metadata = { title: "Aniversariantes próximos" };

const WINDOW_DAYS = 60;

function nextBirthday(birth: string, todayKey: string) {
  const [, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  let year = ty;
  if (bm < tm || (bm === tm && bd < td)) year += 1;
  const next = new Date(Date.UTC(year, bm - 1, bd));
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  const age = year - Number(birth.slice(0, 4));
  const nextKey = next.toISOString().slice(0, 10);
  return { next, nextKey, days, age };
}

function shortDay(d: Date) {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${get("day")}/${get("month").replace(".", "")}`;
}

/** Default message. Variables: {nome_responsavel} {nome_aniversariante} {idade}. */
function promoText(responsavel: string, aniversariante: string, idade: number) {
  return [
    `Oi, ${responsavel}! Tudo bem?`,
    "",
    `Vimos que o aniversário de ${aniversariante} está chegando (${idade} anos!) e lembramos da festa conosco.`,
    "",
    "Se estiver pensando em comemorar este ano, posso montar uma proposta para você. Quer conversar?",
  ].join("\n");
}

export default async function CelebrantsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("celebrants")
    .select("id, name, birth_date, promo_muted_until, customers(id, name, whatsapp, marketing_opt_in), events(id, title, starts_at, customers(name))")
    .order("birth_date");
  const todayKey = toDateKey(new Date());
  const soon = (data ?? [])
    .map((c) => ({ ...c, ...nextBirthday(c.birth_date, todayKey) }))
    .filter((c) => c.days <= WINDOW_DAYS)
    .filter((c) => !c.promo_muted_until || c.promo_muted_until < todayKey)
    .sort((a, b) => a.days - b.days);

  return (
    <>
      <PageHeader title="Aniversariantes próximos" subtitle="Clientes com aniversário próximo e oportunidade de nova festa" />
      <PageBody>
        {soon.length === 0 ? (
          <EmptyState title={`Nenhum aniversário nos próximos ${WINDOW_DAYS} dias.`} description="Cadastre a data de nascimento do aniversariante ao criar um orçamento ou evento." />
        ) : (
          <Card>
            <CardHeader title={`Próximos ${WINDOW_DAYS} dias`} subtitle={`${soon.length} aniversariante${soon.length === 1 ? "" : "s"}`} />
            <CardBody>
              <ul className="divide-y divide-border">
                {soon.map((c) => {
                  const customer = c.customers;
                  const first = customer?.name.split(" ")[0] ?? "";
                  const canPromo = Boolean(customer?.marketing_opt_in);
                  return (
                    <li key={c.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3">
                      <div className="min-w-0 flex-1 basis-64 flex gap-3">
                        <span className="mt-0.5 h-9 w-9 shrink-0 grid place-items-center rounded-xl bg-brand-soft text-brand"><Cake className="h-5 w-5" /></span>
                        <div className="min-w-0">
                          <p className="font-medium">{c.name} <span className="text-muted font-normal">faz {c.age}</span></p>
                          <p className="text-sm text-muted">{c.days === 0 ? "Hoje" : `Em ${c.days} dia${c.days === 1 ? "" : "s"}`} · {shortDay(c.next)}</p>
                          <p className="text-sm text-muted truncate">
                            Responsável: {customer ? <Link href={`/clientes/${customer.id}`} className="text-foreground font-medium hover:underline">{customer.name}</Link> : "—"}
                            {c.events ? <> · Última festa: <Link href={`/eventos/${c.events.id}`} className="text-foreground hover:underline">{formatDate(c.events.starts_at)} · {eventTitle(c.events)}</Link></> : null}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {customer && canPromo ? (
                          <PromoMessage phone={customer.whatsapp} celebrant={c.name} defaultMessage={promoText(first, c.name, c.age)} />
                        ) : (
                          <span className="text-xs text-muted">Cliente não autorizou comunicações promocionais.</span>
                        )}
                        <form action={mutePromo}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="until" value={new Date(c.next.getTime() + 86_400_000).toISOString().slice(0, 10)} />
                          <button className="h-9 px-2 text-xs text-muted hover:text-foreground" title="Oculta só este lembrete. Nada é apagado.">Não enviar promoção</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        )}
      </PageBody>
    </>
  );
}
