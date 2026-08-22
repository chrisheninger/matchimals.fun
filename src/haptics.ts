import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

// Desktop browsers have nothing to buzz, so the switch stays hidden on web
export const canUseHaptics = Platform.OS !== "web";

const STORAGE_KEY = "hapticsEnabled";

// Module-level so the fire-and-forget helpers can check it without a hook;
// the Settings switch follows it through useHapticsEnabled
let enabled = true;
const listeners = new Set<() => void>();
const notifyAll = () => listeners.forEach((notify) => notify());

if (canUseHaptics) {
  AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      if (stored === "false") {
        enabled = false;
        notifyAll();
      }
    })
    .catch(() => {});
}

export const setHapticsEnabled = (value: boolean) => {
  enabled = value;
  notifyAll();
  AsyncStorage.setItem(STORAGE_KEY, String(value)).catch(() => {});
};

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};
const getEnabled = () => enabled;

export const useHapticsEnabled = () =>
  useSyncExternalStore(subscribe, getEnabled);

// Fire-and-forget: a missing engine (simulator) must never surface
const fire = (run: () => Promise<void>) => {
  if (!canUseHaptics || !enabled) {
    return;
  }
  run().catch(() => {});
};

export const haptics = {
  // Buttons and other taps
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // Toggles, switches, and picking from a grid
  select: () => fire(() => Haptics.selectionAsync()),
  // Lifting a card off the deck
  pickup: () =>
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  // A card connected
  match: () =>
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ),
  // A card had nowhere legal to go and snapped back to the deck
  reject: () =>
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    ),
  // The game is won
  celebrate: () =>
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ),
};
