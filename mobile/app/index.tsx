import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useKioskSettings } from "@/lib/kiosk";
import { useOnboardingSeen } from "@/lib/prefs";
import { Loading } from "@/ui/components";

/** Buffet account → Home. Client (phone) → Minhas festas. Nobody → Entrar. */
export default function Index() {
  const { session, profile, loading } = useAuth();
  const { settings: kiosk } = useKioskSettings();
  const { seen } = useOnboardingSeen();
  if (loading || !kiosk || seen === null) return <Loading />;
  // A tablet in kiosk mode always boots into the door board.
  if (session && profile && kiosk.enabled) return <Redirect href="/(app)/quiosque" />;
  if (session && profile) return <Redirect href="/(app)/(tabs)/home" />;
  if (session) return <Redirect href="/cliente" />;
  // First open on this device: show what Komyx does before asking anything.
  if (!seen) return <Redirect href="/onboarding" />;
  return <Redirect href="/entrar" />;
}
