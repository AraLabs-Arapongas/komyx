import Link from "next/link";
import { requireProfile, getOrganization, getBilling } from "@/lib/data/session";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { NotificationsBell } from "@/components/shell/notifications-bell";
import { PrivacyToggle } from "@/components/shell/privacy-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  // The Komyx team's own org is the platform: its members only use /admin.
  if (org.kind === "platform") redirect("/admin");
  const supabase = await createClient();
  const [{ data: unread }, { count: newRequests }, bill] = await Promise.all([
    supabase.rpc("unread_notifications_count"),
    supabase.from("public_requests").select("id", { count: "exact", head: true }).eq("status", "NEW"),
    getBilling(profile),
  ]);
  const billing = { cycleStart: bill?.cycle_start ?? null, dueAt: bill?.due_at ?? null, status: bill?.status ?? "ok", plan: org.plan };
  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} userName={profile.name} userEmail={profile.email} role={profile.role} isAdmin={profile.is_platform_admin} billing={billing} newRequests={newRequests ?? 0} />
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">
        <div className="fixed top-2 right-3 z-30 flex items-center gap-1 rounded-xl bg-background/80 backdrop-blur px-1">
          <PrivacyToggle />
          <NotificationsBell initialUnread={unread ?? 0} />
        </div>
        {org.status === "cancelled" ? (
          <div className="bg-red-50 border-b border-red-200 text-red-700 text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
            <span>Assinatura cancelada{org.access_until ? ` · acesso até ${org.access_until.split("-").reverse().join("/")}` : ""} · página pública fora do ar.</span>
            {profile.role === "owner" ? <Link href="/conta#assinatura" className="font-semibold underline underline-offset-2">Reativar</Link> : null}
          </div>
        ) : null}
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
