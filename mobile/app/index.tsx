import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useKioskSettings } from "@/lib/kiosk";
import { Loading } from "@/ui/components";

/** Buffet account → Home. Client (phone) → Minhas festas. Nobody → Entrar. */
export default function Index() {
  const { session, profile, loading } = useAuth();
  const { settings: kiosk } = useKioskSettings();
  if (loading || !kiosk) return <Loading />;
  // A tablet in kiosk mode always boots into the door board.
  if (session && profile && kiosk.enabled) return <Redirect href="/(app)/quiosque" />;
  if (session && profile) return <Redirect href="/(app)/(tabs)/home" />;
  if (session) return <Redirect href="/cliente" />;
  return <Redirect href="/entrar" />;
}
