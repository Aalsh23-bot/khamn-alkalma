import { durableSetItem } from "./durable-storage";

const HINT_BALANCE_KEY = "khamsa_hint_balance_v1";

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Purchased / claimed hint balance cache. Server (auth.uid()) is source of truth. */
export function loadHintBalance(): number {
  const raw = readLocal(HINT_BALANCE_KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function saveHintBalance(n: number): void {
  const v = String(Math.max(0, Math.floor(n)));
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HINT_BALANCE_KEY, v);
    durableSetItem(HINT_BALANCE_KEY, v);
  } catch {
    /* storage blocked */
  }
}

/**
 * Optimistic local decrement; server (auth.uid()) is source of truth and
 * will correct the cache via spendHintOnServer / sync.
 */
export function consumePurchasedHint(): boolean {
  const bal = loadHintBalance();
  if (bal <= 0) return false;
  saveHintBalance(Math.max(0, bal - 1));
  void import("@/lib/iap/purchases")
    .then((m) => m.spendHintOnServer())
    .catch(() => {
      /* offline — cache may be briefly ahead until next sync */
    });
  return true;
}

/** @deprecated Free daily hint is claimed in the shop (Kuwait midnight), not mid-round. */
export type HintOfferKind = "balance" | "ad" | "exhausted";

/**
 * In-round offer for spending a hint from balance (ads are a separate button).
 */
export function resolveHintOffer(roundHintsLeft: number): HintOfferKind {
  if (roundHintsLeft <= 0) return "exhausted";
  if (loadHintBalance() > 0) return "balance";
  return "ad";
}

export function hintOfferLabel(
  kind: HintOfferKind,
  balance = loadHintBalance(),
): string {
  switch (kind) {
    case "balance":
      return `تلميحاتك (${balance})`;
    case "ad":
      return "تلميح بإعلان";
    case "exhausted":
      return "استُخدم التلميحان";
  }
}

/** Format ms until next Kuwait midnight for the free-hint countdown. */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
