/**
 * Supabase auth storage backed by iOS Keychain / Android Keystore when native,
 * with an in-memory + localStorage fallback for web/preview.
 *
 * Uses capacitor-secure-storage-plugin (Keychain) so sessions survive reinstall
 * when the OS restores the keychain item.
 */
import type { SupportedStorage } from "@supabase/supabase-js";

const PREFIX = "sb-auth:";

type SecurePlugin = {
  set: (opts: { key: string; value: string }) => Promise<void>;
  get: (opts: { key: string }) => Promise<{ value: string }>;
  remove: (opts: { key: string }) => Promise<void>;
};

let pluginPromise: Promise<SecurePlugin | null> | null = null;
const memory = new Map<string, string>();

async function getSecurePlugin(): Promise<SecurePlugin | null> {
  if (pluginPromise) return pluginPromise;
  pluginPromise = (async () => {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return null;
      const mod = await import("capacitor-secure-storage-plugin");
      return mod.SecureStoragePlugin as unknown as SecurePlugin;
    } catch {
      return null;
    }
  })();
  return pluginPromise;
}

function lsGet(key: string): string | null {
  if (typeof localStorage === "undefined") return memory.get(key) ?? null;
  try {
    return localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function lsSet(key: string, value: string): void {
  memory.set(key, value);
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function lsRemove(key: string): void {
  memory.delete(key);
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const secureAuthStorage: SupportedStorage = {
  async getItem(key: string) {
    const full = PREFIX + key;
    const secure = await getSecurePlugin();
    if (secure) {
      try {
        const { value } = await secure.get({ key: full });
        if (value != null && value !== "") {
          lsSet(full, value); // keep web cache warm for sync reads
          return value;
        }
      } catch {
        /* key missing */
      }
    }
    return lsGet(full);
  },

  async setItem(key: string, value: string) {
    const full = PREFIX + key;
    lsSet(full, value);
    const secure = await getSecurePlugin();
    if (secure) {
      try {
        await secure.set({ key: full, value });
      } catch (err) {
        console.warn("[khamsa] Keychain set failed", err);
      }
    }
  },

  async removeItem(key: string) {
    const full = PREFIX + key;
    lsRemove(full);
    const secure = await getSecurePlugin();
    if (secure) {
      try {
        await secure.remove({ key: full });
      } catch {
        /* ignore */
      }
    }
  },
};
