import { Redirect, useLocalSearchParams } from "expo-router";
export default function G() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <Redirect href={{ pathname: "/convidado/[token]", params: { token } }} />;
}
