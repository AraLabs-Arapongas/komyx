import { requireOwner } from "@/lib/data/session";
import { PageHeader } from "@/components/ui/page";
import { SettingsTabs } from "./settings-tabs";

/** Configurações: one header and the section tabs; each section is its own route below. */
export default async function SettingsLayout({ children }: LayoutProps<"/configuracoes">) {
  await requireOwner();
  return (
    <>
      <PageHeader title="Configurações" back="/menu" />
      <SettingsTabs />
      {children}
    </>
  );
}
