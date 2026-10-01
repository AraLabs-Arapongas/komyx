import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/ui/components";

/** Buffet account → Home. Client (phone) → Minhas festas. Nobody → Entrar. */
export default function Index() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (session && profile) return <Redirect href="/(app)/(tabs)/home" />;
  if (session) return <Redirect href="/cliente" />;
  return <Redirect href="/entrar" />;
}
