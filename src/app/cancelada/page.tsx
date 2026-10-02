import { requireProfile } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";
import { reactivateSubscription } from "@/lib/actions/subscription";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Assinatura cancelada" };

export default async function CancelledPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("name, status, access_until, cancelled_at").eq("id", profile.organization_id).single();
  const until = org?.access_until ? formatDate(`${org.access_until}T12:00:00-03:00`) : null;
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-brand text-brand-fg grid place-items-center text-xl font-bold">F</div>
        <h1 className="text-2xl font-semibold">Assinatura cancelada</h1>
        <p className="text-muted">O {org?.name} cancelou o Komyx{until ? ` e o acesso terminou em ${until}` : ""}. Agenda, clientes, orçamentos e contratos continuam guardados por 90 dias. Reative quando quiser e tudo volta como estava.</p>
        {profile.role === "owner" ? (
          <form action={reactivateSubscription}><button className={buttonClass("primary", "lg")}>Reativar assinatura</button></form>
        ) : <p className="text-sm text-muted">Só a proprietária pode reativar.</p>}
        <form action="/auth/signout" method="post"><button className="text-sm text-muted">Sair</button></form>
      </div>
    </main>
  );
}
