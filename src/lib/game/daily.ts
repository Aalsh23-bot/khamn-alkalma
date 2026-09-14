import { ANSWERS } from "./words";
import { WORD_TIERS } from "./word-tiers";

export const EPOCH = { y: 2026, m: 8, d: 29 };

/** Daily puzzle uses familiar everyday words only (usage tier: common). */
const DAILY_POOL: string[] = ANSWERS.filter(
  (w) => (WORD_TIERS[w] ?? "familiar") === "common",
);

export function dailyPool(): readonly string[] {
  return DAILY_POOL.length > 0 ? DAILY_POOL : ANSWERS;
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

export function dailyAnswer(dateKey: string): string {
  const pool = dailyPool();
  const n = puzzleNumber(dateKey);
  const idx = ((n - 1) % pool.length + pool.length) % pool.length;
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
