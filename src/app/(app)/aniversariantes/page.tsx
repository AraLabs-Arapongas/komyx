import Link from "next/link";
import { Cake, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { removeCelebrant } from "@/lib/actions/celebrants";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { toDateKey, whatsappLink } from "@/lib/utils";

export const metadata = { title: "Aniversariantes" };

function nextBirthday(birth: string, todayKey: string) {
  const [, bm, bd] = birth.split("-").map(Number);
  const [ty, tm, td] = todayKey.split("-").map(Number);
  let year = ty;
  if (bm < tm || (bm === tm && bd < td)) year += 1;
  const next = new Date(Date.UTC(year, bm - 1, bd));
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const days = Math.round((next.getTime() - today.getTime()) / 86_400_000);
  const age = year - Number(birth.slice(0, 4));
  return { next, days, age };
}

export default async function CelebrantsPage() {
  const org = await getOrganization();
  const supabase = await createClient();
  const { data } = await supabase.from("celebrants").select("id, name, birth_date, notes, customers(id, name, whatsapp), events(id, title, starts_at)").order("birth_date");
  const todayKey = toDateKey(new Date());
  const list = (data ?? []).map((c) => ({ ...c, ...nextBirthday(c.birth_date, todayKey) })).sort((a, b) => a.days - b.days);
  const soon = list.filter((c) => c.days <= 60);
  const later = list.filter((c) => c.days > 60);

  const Row = ({ c }: { c: (typeof list)[number] }) => {
    const msg = `Olá ${c.customers?.name.split(" ")[0]}! Aqui é do ${org.name}. ${c.name} faz ${c.age} anos em ${c.next.getUTCDate().toString().padStart(2, "0")}/${(c.next.getUTCMonth() + 1).toString().padStart(2, "0")} 🎉 Que tal comemorar com a gente? Temos condições especiais para quem já fez festa aqui.`;
    return (
      <li className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0">
          <p className="font-medium truncate"><Cake className="inline h-4 w-4 text-brand mr-1" />{c.name} <span className="text-muted font-normal">faz {c.age}</span></p>
          <p className="text-xs text-muted">
            {c.days === 0 ? "Hoje!" : `em ${c.days} dia${c.days === 1 ? "" : "s"}`} · {c.next.getUTCDate().toString().padStart(2, "0")}/{(c.next.getUTCMonth() + 1).toString().padStart(2, "0")}
            {c.customers ? <> · responsável <Link href={`/clientes/${c.customers.id}`} className="text-brand">{c.customers.name}</Link></> : null}
            {c.events ? <> · <Link href={`/eventos/${c.events.id}`} className="text-brand">última festa</Link></> : null}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {c.customers ? <a href={whatsappLink(c.customers.whatsapp, msg)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Promo</a> : null}
          <form action={removeCelebrant}><input type="hidden" name="id" value={c.id} /><button className="h-9 px-2 text-xs text-muted hover:text-red-600">Remover</button></form>
        </div>
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Aniversariantes" subtitle="Quem fez festa aqui e faz aniversário em breve" />
      <PageBody>
        <Card>
          <CardHeader title="Próximos 60 dias" subtitle="Mande uma promoção pelo WhatsApp antes que fechem em outro lugar" />
          <CardBody>
            {soon.length ? <ul className="divide-y divide-border">{soon.map((c) => <Row key={c.id} c={c} />)}</ul> : <p className="text-sm text-muted">Nenhum aniversário nos próximos 60 dias.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Mais adiante" />
          <CardBody>
            {later.length ? <ul className="divide-y divide-border">{later.map((c) => <Row key={c.id} c={c} />)}</ul> : <p className="text-sm text-muted">Cadastre a data de nascimento do aniversariante ao criar a reserva.</p>}
          </CardBody>
        </Card>
        {list.length === 0 ? <EmptyState title="Nenhum aniversariante" description="Informe a data de nascimento na reserva ou na ficha do cliente." /> : null}
      </PageBody>
    </>
  );
}
