import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/** Small device preferences (not secrets): onboarding seen, etc. */
const KEY_ONBOARDING = "komyx.onboarding.seen";

export async function getOnboardingSeen() {
  return (await AsyncStorage.getItem(KEY_ONBOARDING)) === "1";
}

export async function setOnboardingSeen(seen: boolean) {
  if (seen) await AsyncStorage.setItem(KEY_ONBOARDING, "1");
  else await AsyncStorage.removeItem(KEY_ONBOARDING);
}

export function useOnboardingSeen() {
  const [seen, setSeen] = useState<boolean | null>(null);
  const refresh = useCallback(() => { getOnboardingSeen().then(setSeen); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { seen, refresh };
}
