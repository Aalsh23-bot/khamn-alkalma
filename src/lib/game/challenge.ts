import { ANSWERS } from "./words";
import { dailyPool } from "./daily";
import { APP_NAME } from "./brand";

const SALT = 0x5a3c;

/** Compact opaque code for a shared challenge answer. */
export function encodeChallenge(answer: string): string {
  const idx = ANSWERS.indexOf(answer);
  if (idx < 0) throw new Error("unknown challenge answer");
  const mixed = (idx ^ SALT) >>> 0;
  return mixed.toString(36);
}

export function decodeChallenge(code: string): string | null {
  if (!code || !/^[0-9a-z]+$/i.test(code)) return null;
  try {
    const mixed = parseInt(code, 36);
    if (!Number.isFinite(mixed)) return null;
    const idx = (mixed ^ SALT) >>> 0;
    if (idx < 0 || idx >= ANSWERS.length) return null;
    return ANSWERS[idx] ?? null;
  } catch {
    return null;
  }
}

/** Prefer everyday words so friend challenges stay fun. */
export function randomChallengeAnswer(): string {
  const pool = dailyPool();
  const list = pool.length > 0 ? pool : ANSWERS;
  return list[Math.floor(Math.random() * list.length)]!;
}

export function challengePath(code: string): string {
  return `?c=${encodeURIComponent(code)}`;
}

export function challengeAbsoluteUrl(code: string): string {
  if (typeof window === "undefined") return challengePath(code);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}${challengePath(code)}`;
}

export function readChallengeCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const q = new URLSearchParams(window.location.search).get("c");
    if (q) return q;
    const hash = window.location.hash.replace(/^#/, "");
    const fromHash = new URLSearchParams(hash).get("c");
    if (fromHash) return fromHash;
    const m = window.location.hash.match(/[#&?]c=([0-9a-z]+)/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function clearChallengeCodeFromUrl() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("c") && !/#.*c=/.test(url.hash)) return;
    url.searchParams.delete("c");
    if (url.hash.includes("c=")) url.hash = "";
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
}

export function challengeInviteText(code: string): string {
  const url = challengeAbsoluteUrl(code);
  return [
    `تحدّيتُك في ${APP_NAME}!`,
    "نفس الكلمة — شوف مين يحلها بأقل محاولات.",
    "",
    url,
  ].join("\n");
}
