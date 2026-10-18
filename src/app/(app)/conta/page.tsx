import Link from "next/link";
import { ChevronRight, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { NameForm, PasswordForm, EmailNotificationsForm } from "./account-forms";

export const metadata = { title: "Minha conta" };

/** Profile, password and e-mail notices. The Komyx subscription has its own page (/assinatura). */
export default async function AccountPage() {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const isOwner = profile.role === "owner";
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("profiles").select("email_notifications").eq("id", profile.id).single();

  return (
    <>
      <PageHeader title="Minha conta" subtitle={`${profile.email} · ${isOwner ? "Proprietário" : "Equipe"} · ${org.name}`} back="/menu" />
      <PageBody>
        <Card id="perfil">
          <CardHeader title="Perfil" />
          <CardBody className="space-y-6">
            <NameForm name={profile.name} email={profile.email} />
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Alterar senha</p>
              <PasswordForm />
            </div>
            <div className="border-t border-border pt-4">
              <EmailNotificationsForm enabled={prefs?.email_notifications ?? true} />
            </div>
          </CardBody>
        </Card>
        {isOwner ? (
          <Link href="/assinatura" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm hover:bg-stone-50">
            <CreditCard className="h-5 w-5 text-muted" />
            <span className="flex-1"><span className="block font-medium">Assinatura</span><span className="text-muted">Seu plano do Komyx e pagamento</span></span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Link>
        ) : null}
      </PageBody>
    </>
  );
}
