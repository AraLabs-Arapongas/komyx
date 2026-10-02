import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import { Kiosk } from "../../modules/kiosk";

/**
 * Kiosk ("modo quiosque") settings live on the device, not on the server: a tablet is a device
 * profile, not a user. Enabled + a 4-6 digit PIN that gates leaving the kiosk or opening the
 * owner's screens.
 */
const KEY_ENABLED = "komyx.kiosk.enabled";
const KEY_PIN = "komyx.kiosk.pin";

export type KioskSettings = { enabled: boolean; hasPin: boolean };

export async function getKioskSettings(): Promise<KioskSettings> {
  const [enabled, pin] = await Promise.all([SecureStore.getItemAsync(KEY_ENABLED), SecureStore.getItemAsync(KEY_PIN)]);
  return { enabled: enabled === "1", hasPin: Boolean(pin) };
}

export async function setKioskPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error("O PIN precisa ter de 4 a 6 números.");
  await SecureStore.setItemAsync(KEY_PIN, pin);
}

export async function verifyKioskPin(pin: string) {
  const saved = await SecureStore.getItemAsync(KEY_PIN);
  return Boolean(saved) && saved === pin;
}

export async function setKioskEnabled(enabled: boolean) {
  await SecureStore.setItemAsync(KEY_ENABLED, enabled ? "1" : "0");
  if (!enabled) Kiosk.stopLockTask();
}

/** Reactive view of the kiosk settings for screens; `refresh` after changing them. */
export function useKioskSettings() {
  const [settings, setSettings] = useState<KioskSettings | null>(null);
  const refresh = useCallback(() => { getKioskSettings().then(setSettings); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { settings, refresh };
}

export { Kiosk };
