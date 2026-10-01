import { requireProfile, getOrganization } from "@/lib/data/session";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";
import { NotificationsBell } from "@/components/shell/notifications-bell";
import { PrivacyToggle } from "@/components/shell/privacy-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const supabase = await createClient();
  const { data: unread } = await supabase.rpc("unread_notifications_count");
  const billing = { cycleStart: org.billing_cycle_start, dueAt: org.billing_due_at, status: org.billing_status, plan: org.plan };
  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} userName={profile.name} userEmail={profile.email} role={profile.role} isAdmin={profile.is_platform_admin} billing={billing} />
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
