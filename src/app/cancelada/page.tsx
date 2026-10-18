import { getBilling, requireProfile } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";
import { ReactivateButton } from "@/components/billing/reactivate-button";
import { isPeriodMonths, periodPrice } from "@/lib/billing/plans";
import { formatDate } from "@/lib/utils";
import { PendingButton } from "@/components/ui/pending-button";

export const metadata = { title: "Assinatura cancelada" };

export default async function CancelledPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("name, status, access_until, cancelled_at").eq("id", profile.organization_id).single();
  const bill = await getBilling(profile);
  const amount = periodPrice(isPeriodMonths(bill?.billing_period) ? bill.billing_period : 1, bill?.monthly_price);
  const until = org?.access_until ? formatDate(`${org.access_until}T12:00:00-03:00`) : null;
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-brand text-brand-fg grid place-items-center text-xl font-bold">F</div>
        <h1 className="text-2xl font-semibold">Assinatura cancelada</h1>
        <p className="text-muted">O {org?.name} cancelou o Komyx{until ? ` e o acesso terminou em ${until}` : ""}. Agenda, clientes, orçamentos e contratos continuam guardados por 90 dias. Pague a mensalidade para reativar e tudo volta como estava.</p>
        {profile.role === "owner" ? (
          <ReactivateButton amount={amount} size="lg" />
        ) : <p className="text-sm text-muted">Só a proprietária pode reativar.</p>}
        <form action="/auth/signout" method="post"><PendingButton className="text-sm text-muted">Sair</PendingButton></form>
      </div>
    </main>
  );
}
