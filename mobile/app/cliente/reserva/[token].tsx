import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useParty } from "@/lib/party-context";
import { Loading } from "@/ui/components";

/** A reservation link (komyx.com.br/r/<token>) puts that party in context and lands on Início. */
export default function ReservaLink() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { token: current, ready, setToken } = useParty();
  useEffect(() => { if (ready && token && token !== current) setToken(token); }, [ready, token, current, setToken]);
  if (!ready || (token && token !== current)) return <Loading />;
  return <Redirect href="/cliente" />;
}
