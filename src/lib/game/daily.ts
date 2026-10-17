import { ANSWERS } from "./words";
import { WORD_TIERS } from "./word-tiers";

export const EPOCH = { y: 2026, m: 8, d: 29 };

/**
 * After this local date (inclusive), daily answers use the expanded shuffled pool.
 * Dates before keep the legacy sequential common-only order so past puzzles stay stable.
 */
export const DAILY_SHUFFLE_START = "2026-10-22";

const SHUFFLE_SEED = 0x4b48_4d4e; // KHMN

/** Legacy pool: common tier only (~334). Used for dates before DAILY_SHUFFLE_START. */
const LEGACY_DAILY_POOL: string[] = ANSWERS.filter(
  (w) => (WORD_TIERS[w] ?? "familiar") === "common",
);

function buildExpandedPool(): string[] {
  const common = ANSWERS.filter((w) => (WORD_TIERS[w] ?? "familiar") === "common");
  if (common.length >= 365) return common;
  const familiar = ANSWERS.filter((w) => WORD_TIERS[w] === "familiar");
  const need = 365 - common.length;
  return [...common, ...familiar.slice(0, Math.max(need, 0))];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleDeterministic(list: string[], seed: number): string[] {
  const out = [...list];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

const EXPANDED_SHUFFLED_POOL: string[] = shuffleDeterministic(
  buildExpandedPool(),
  SHUFFLE_SEED,
);

/** Active daily pool (expanded + shuffled). Prefer this for challenges / UI. */
export function dailyPool(): readonly string[] {
  if (EXPANDED_SHUFFLED_POOL.length > 0) return EXPANDED_SHUFFLED_POOL;
  if (LEGACY_DAILY_POOL.length > 0) return LEGACY_DAILY_POOL;
  return ANSWERS;
}

export function legacyDailyPool(): readonly string[] {
  return LEGACY_DAILY_POOL.length > 0 ? LEGACY_DAILY_POOL : ANSWERS;
}

export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function puzzleNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = Date.UTC(y, (m ?? 1) - 1, d);
  const epoch = Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d);
  return Math.floor((utc - epoch) / 86_400_000) + 1;
}

function daysBetween(startKey: string, dateKey: string): number {
  const [ys, ms, ds] = startKey.split("-").map(Number);
  const [y, m, d] = dateKey.split("-").map(Number);
  const a = Date.UTC(ys!, (ms ?? 1) - 1, ds);
  const b = Date.UTC(y!, (m ?? 1) - 1, d);
  return Math.floor((b - a) / 86_400_000);
}

export function dailyAnswer(dateKey: string): string {
  if (dateKey < DAILY_SHUFFLE_START) {
    const pool = legacyDailyPool();
    const n = puzzleNumber(dateKey);
    const idx = ((n - 1) % pool.length + pool.length) % pool.length;
    return pool[idx]!;
  }
  const pool = dailyPool();
  const dayIndex = daysBetween(DAILY_SHUFFLE_START, dateKey);
  const idx = ((dayIndex % pool.length) + pool.length) % pool.length;
  return pool[idx]!;
}

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatArabicDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function msUntilTomorrow(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
