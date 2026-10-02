import { Redirect } from "expo-router";

/** Placeholder tab: the round "+" button opens the Novo orçamento sheet; the tab itself never shows. */
export default function NovoTab() {
  return <Redirect href="/(app)/novo" />;
}
