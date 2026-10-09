import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/** Keys that must survive app restarts / TestFlight updates on iOS. */
export const DURABLE_KEYS = [
  "khamsa:stages",
  "khamsa:stats",
  "khamsa:settings",
  "khamsa:achievements",
  "khamsa:challenge-stats",
  "khamsa:round:daily",
  "khamsa:round:stages",
  "khamsa:round:challenge",
  // legacy round keys (migrated on read; still mirrored if present)
  "khamsa:daily",
  "khamsa:challenge",
] as const;

/**
 * Pull Capacitor Preferences into localStorage before the game hydrates.
 * Also migrates any existing localStorage values into Preferences once.
 */
export async function hydrateDurableStorage(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!Capacitor.isNativePlatform()) return;

  try {
    for (const key of DURABLE_KEYS) {
      const { value } = await Preferences.get({ key });
      if (value != null && value !== "") {
        localStorage.setItem(key, value);
        continue;
      }
      const existing = localStorage.getItem(key);
      if (existing != null) {
        await Preferences.set({ key, value: existing });
      }
    }
  } catch (err) {
    console.warn("[khamsa] durable storage hydrate failed", err);
  }
}

/** Sync write to localStorage + async mirror to native Preferences. */
export function durableSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
  if (!Capacitor.isNativePlatform()) return;
  void Preferences.set({ key, value }).catch((err) => {
    console.warn("[khamsa] Preferences.set failed", key, err);
  });
}
