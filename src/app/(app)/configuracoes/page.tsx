import { redirect } from "next/navigation";

/** /configuracoes opens the first tab. */
export default function SettingsIndex() {
  redirect("/configuracoes/empresa");
}
