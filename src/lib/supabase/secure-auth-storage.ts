/**
 * Supabase auth storage backed by iOS Keychain / Android Keystore when native,
 * with an in-memory + localStorage fallback for web/preview.
 *
 * Migrates legacy 1.0.1 localStorage sessions into Keychain once so users are
 * not unexpectedly signed out after upgrading.
 */
import type { SupportedStorage } from "@supabase/supabase-js";

const PREFIX = "sb-auth:";
/** Legacy 1.0.1 supabase-js session key (project ref in URL). */
const LEGACY_AUTH_TOKEN_KEY = "sb-eqxaivexuowngyigmqwl-auth-token";

type SecurePlugin = {
  set: (opts: { key: string; value: string }) => Promise<void>;
  get: (opts: { key: string }) => Promise<{ value: string }>;
  remove: (opts: { key: string }) => Promise<void>;
};

let pluginPromise: Promise<SecurePlugin | null> | null = null;
const memory = new Map<string, string>();
const migratedKeys = new Set<string>();

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

/** Legacy localStorage keys used before Keychain (1.0.1 and bare supabase-js). */
function legacyLocalValues(storageKey: string): string | null {
  const candidates = [
    PREFIX + storageKey,
    storageKey,
  ];
  if (typeof localStorage !== "undefined") {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        // Default supabase-js key: sb-<project-ref>-auth-token
        if (/^sb-[a-z0-9]+-auth-token$/i.test(k)) candidates.push(k);
      }
    } catch {
      /* ignore */
    }
  }
  for (const k of candidates) {
    const v = lsGet(k);
    if (v) return v;
  }
  return null;
}

function clearLegacyLocalAuthKeys(): void {
  lsRemove(LEGACY_AUTH_TOKEN_KEY);
  if (typeof localStorage === "undefined") return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-[a-z0-9]+-auth-token$/i.test(k)) toRemove.push(k);
    }
    for (const k of toRemove) lsRemove(k);
  } catch {
    /* ignore */
  }
}

async function migrateToKeychain(
  storageKey: string,
  value: string,
  secure: SecurePlugin,
): Promise<void> {
  if (migratedKeys.has(storageKey)) return;
  migratedKeys.add(storageKey);
  const full = PREFIX + storageKey;
  try {
    await secure.set({ key: full, value });
    lsSet(full, value);
    // Drop 1.0.1 localStorage session so logout/delete cannot resurrect it.
    clearLegacyLocalAuthKeys();
  } catch (err) {
    console.warn("[khamsa] Keychain migrate failed", err);
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
          lsSet(full, value);
          return value;
        }
      } catch {
        /* key missing in Keychain */
      }
      // One-time migration from 1.0.1 localStorage session.
      const legacy = legacyLocalValues(key);
      if (legacy) {
        await migrateToKeychain(key, legacy, secure);
        return legacy;
      }
    }
    return lsGet(full) ?? legacyLocalValues(key);
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
    lsRemove(key);
    clearLegacyLocalAuthKeys();
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
