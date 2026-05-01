import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { Appearance } from "react-native";

export type ThemeMode = "light" | "dark" | "auto";

const STORAGE_KEY = "padel-theme-mode-v1";

let mode: ThemeMode = "auto";
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function applyAppearance() {
  // Push the resolved scheme into the global Appearance singleton so every
  // `useColorScheme()` consumer (incl. PlatformColor on iOS) follows the
  // user's preference. `null` means "follow system".
  const next = mode === "auto" ? null : mode;
  // setColorScheme is RN 0.73+; Expo 55 ships it. Guard just in case.
  if (typeof Appearance.setColorScheme === "function") {
    // The RN type signature on this method excludes `null` even though
    // passing `null` is the documented "follow system" reset.
    (Appearance.setColorScheme as (s: "light" | "dark" | null) => void)(next);
  }
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((raw) => {
    if (raw === "light" || raw === "dark" || raw === "auto") {
      mode = raw;
    }
    hydrated = true;
    applyAppearance();
    notify();
  })
  .catch(() => {
    hydrated = true;
  });

export function getThemeMode(): ThemeMode {
  return mode;
}

export function setThemeMode(next: ThemeMode) {
  if (mode === next) return;
  mode = next;
  applyAppearance();
  if (hydrated) AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  notify();
}

const store = {
  getSnapshot: () => mode,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
