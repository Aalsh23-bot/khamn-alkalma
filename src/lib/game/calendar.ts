/** Month grid helpers for the daily-win calendar (local YYYY-MM-DD keys). */

export function monthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7); // YYYY-MM
}

export function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m! - 1) + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

/** 0 = Saturday … 6 = Friday (RTL-friendly week start for Arabic UI). */
export function weekdayIndexSatFirst(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const js = new Date(Date.UTC(y!, (m! - 1), d)).getUTCDay(); // 0 Sun .. 6 Sat
  return (js + 1) % 7; // Sat=0
}

export function formatMonthLabel(monthKey: string): string {
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
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function buildMonthCells(monthKey: string): Array<string | null> {
  const days = daysInMonth(monthKey);
  const first = `${monthKey}-01`;
  const pad = weekdayIndexSatFirst(first);
  const cells: Array<string | null> = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${monthKey}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
