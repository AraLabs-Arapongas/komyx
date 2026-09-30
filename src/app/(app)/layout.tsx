import { requireProfile, getOrganization } from "@/lib/data/session";
import { BottomNav } from "@/components/shell/bottom-nav";
import { Sidebar } from "@/components/shell/sidebar";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={org.name} userName={profile.name} role={profile.role} />
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">{children}</div>
      <BottomNav />
    </div>
  );
}
