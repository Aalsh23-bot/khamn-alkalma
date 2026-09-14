import { useMemo, useState } from "react";
import {
  buildMonthCells,
  formatMonthLabel,
  monthKeyFromDateKey,
  shiftMonth,
} from "@/lib/game/calendar";
import { localDateKey } from "@/lib/game/daily";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["س", "ح", "ن", "ث", "ر", "خ", "ج"]; // سبت → جمعة

export function WinCalendar({
  dailyWins,
  currentStreak,
}: {
  dailyWins: Record<string, true>;
  currentStreak: number;
}) {
  const today = localDateKey();
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDateKey(today));
  const cells = useMemo(() => buildMonthCells(monthKey), [monthKey]);
  const winsInMonth = cells.filter((d) => d && dailyWins[d]).length;

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">تقويم كلمة اليوم</p>
        {currentStreak > 0 && (
          <span className="rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-medium text-accent">
            السلسلة {currentStreak}
          </span>
        )}
      </div>

      <div className="rounded-xl bg-bg px-3 py-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg"
            aria-label="الشهر التالي"
            onClick={() => setMonthKey((m) => shiftMonth(m, 1))}
          >
            ‹
          </button>
          <p className="text-sm font-medium">{formatMonthLabel(monthKey)}</p>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg"
            aria-label="الشهر السابق"
            onClick={() => setMonthKey((m) => shiftMonth(m, -1))}
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted" dir="rtl">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1" dir="rtl">
          {cells.map((dateKey, i) => {
            if (!dateKey) return <span key={`e-${i}`} className="aspect-square" />;
            const day = Number(dateKey.slice(-2));
            const won = Boolean(dailyWins[dateKey]);
            const isToday = dateKey === today;
            return (
              <span
                key={dateKey}
                title={dateKey}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md text-xs tabular-nums",
                  won && "bg-correct font-semibold text-correct-fg",
                  !won && isToday && "border border-accent text-accent",
                  !won && !isToday && "text-muted",
                )}
              >
                {day}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">
          {winsInMonth > 0 ? `${winsInMonth} فوز هذا الشهر` : "لا انتصارات بعد في هذا الشهر"}
        </p>
      </div>
    </div>
  );
}
