import { localDateKey } from "./daily";
import { durableSetItem } from "./durable-storage";

const FREE_HINT_KEY = "khamsa_free_hint_date_v1";
const HINT_BALANCE_KEY = "khamsa_hint_balance_v1";

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Date key (local) when the free daily hint was last consumed. */
export function loadFreeHintUsedDate(): string | null {
  return readLocal(FREE_HINT_KEY);
}

export function isFreeHintAvailable(dateKey = localDateKey()): boolean {
  return loadFreeHintUsedDate() !== dateKey;
}

export function consumeFreeHint(dateKey = localDateKey()): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FREE_HINT_KEY, dateKey);
    durableSetItem(FREE_HINT_KEY, dateKey);
  } catch {
    /* storage blocked */
  }
}

/** Purchased hint balance (phase 2). Defaults to 0 until IAP ships. */
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

export function consumePurchasedHint(): boolean {
  const bal = loadHintBalance();
  if (bal <= 0) return false;
  saveHintBalance(bal - 1);
  // Best-effort server decrement (lazy import avoids cycles).
  void import("@/lib/iap/purchases")
    .then((m) => m.spendHintOnServer())
    .catch(() => {
      /* offline */
    });
  return true;
}

export type HintOfferKind = "free" | "balance" | "ad" | "exhausted";

/**
 * Priority: free daily → purchased balance → rewarded ad.
 * `roundHintsLeft` is how many hints remain in this round (max 2).
 */
export function resolveHintOffer(
  roundHintsLeft: number,
  dateKey = localDateKey(),
): HintOfferKind {
  if (roundHintsLeft <= 0) return "exhausted";
  if (isFreeHintAvailable(dateKey)) return "free";
  if (loadHintBalance() > 0) return "balance";
  return "ad";
}

export function hintOfferLabel(kind: HintOfferKind, balance = loadHintBalance()): string {
  switch (kind) {
    case "free":
      return "تلميح مجاني";
    case "balance":
      return `تلميح (${balance})`;
    case "ad":
      return "تلميح مقابل إعلان";
    case "exhausted":
      return "استُخدم التلميحان";
  }
}
