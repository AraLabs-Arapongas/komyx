import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Loading } from "@/ui/components";

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <Loading />;
  return <Redirect href={session ? "/(app)/(tabs)/home" : "/welcome"} />;
}
