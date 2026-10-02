import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Android lock-task ("modo quiosque") bridge. Null in Expo Go, on iOS and on the web: every call
 * then becomes a no-op so the kiosk screen still works as a plain full-screen view.
 *
 * With the tablet provisioned as device owner (see mobile/README.md), startLockTask pins the app
 * without any system prompt and the home/recents buttons stop working until stopLockTask.
 */
type KioskNative = {
  isDeviceOwner(): boolean;
  isLockTaskPermitted(): boolean;
  isInLockTask(): boolean;
  startLockTask(): boolean;
  stopLockTask(): boolean;
};

const native = Platform.OS === "android" ? requireOptionalNativeModule<KioskNative>("Kiosk") : null;

export const Kiosk = {
  available: native !== null,
  isDeviceOwner: () => native?.isDeviceOwner() ?? false,
  isLockTaskPermitted: () => native?.isLockTaskPermitted() ?? false,
  isInLockTask: () => native?.isInLockTask() ?? false,
  startLockTask: () => native?.startLockTask() ?? false,
  stopLockTask: () => native?.stopLockTask() ?? false,
};
