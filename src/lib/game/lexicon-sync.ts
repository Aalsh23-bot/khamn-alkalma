import {
  guessLexiconSize,
  mergeServerGuesses,
  replaceGuessSetFromServer,
} from "./words";

const CACHE_KEY = "khamsa:lexicon-v1";

export type LexiconSnapshot = {
  updated_at: string;
  count: number;
  words: string[];
};

type CacheShape = LexiconSnapshot & { fetched_at: string };

export function loadCachedLexicon(): LexiconSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!Array.isArray(parsed.words) || parsed.words.length < 100) return null;
    replaceGuessSetFromServer(parsed.words);
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedLexicon(snap: LexiconSnapshot) {
  if (typeof window === "undefined") return;
  replaceGuessSetFromServer(snap.words);
  try {
    const payload: CacheShape = {
      ...snap,
      fetched_at: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function applyLexiconWords(words: string[], mode: "replace" | "merge" = "replace") {
  if (!words.length) return;
  if (mode === "merge") mergeServerGuesses(words);
  else replaceGuessSetFromServer(words);
}

export function lexiconSize(): number {
  return guessLexiconSize();
}

/** Sync at most once per day unless forced. */
export function shouldRefreshLexicon(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!Array.isArray(parsed.words) || parsed.words.length < 100) return true;
    const fetched = Date.parse(parsed.fetched_at || "");
    if (!Number.isFinite(fetched)) return true;
    return Date.now() - fetched > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}
