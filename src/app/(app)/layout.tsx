import { requireProfile, getOrganization, getBilling } from "@/lib/data/session";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { NotificationsBell } from "@/components/shell/notifications-bell";
import { PrivacyToggle } from "@/components/shell/privacy-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
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
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
