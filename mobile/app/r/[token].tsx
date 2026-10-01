import { Redirect, useLocalSearchParams } from "expo-router";
export default function R() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <Redirect href={{ pathname: "/cliente/reserva/[token]", params: { token } }} />;
}
