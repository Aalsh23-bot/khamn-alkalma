import { Delete } from "lucide-react";
import { KEY_ROWS } from "@/lib/game/keyboard";
import type { KeyStatus } from "@/lib/game/evaluate";
import { cn } from "@/lib/utils";

const KEY_CLASS: Record<KeyStatus, string> = {
  unused: "bg-key text-key-fg",
  absent: "bg-absent text-absent-fg",
  present: "bg-present text-present-fg",
  correct: "bg-correct text-correct-fg",
};

export function Keyboard({
  keyMap,
  onLetter,
  onEnter,
  onDelete,
  disabled,
}: {
  keyMap: Record<string, KeyStatus>;
  onLetter: (ch: string) => void;
  onEnter: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-1.5 px-1" dir="rtl">
      {KEY_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1">
          {ri === 2 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onEnter}
              className="keycap h-14 min-w-12 flex-[1.4] rounded-md bg-accent text-sm font-semibold text-accent-fg transition-transform duration-150 active:scale-[0.96] disabled:opacity-60"
            >
              إدخال
            </button>
          )}
          {row.map((ch, i) => {
            const st = keyMap[ch] ?? "unused";
            return (
              <button
                key={`${ri}-${ch}-${i}`}
                type="button"
                disabled={disabled}
                onClick={() => onLetter(ch)}
                className={cn(
                  "keycap h-14 min-w-0 flex-1 rounded-md text-lg font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.96] disabled:opacity-60",
                  KEY_CLASS[st],
                )}
              >
                {ch}
              </button>
            );
          })}
          {ri === 2 && (
            <button
              type="button"
              disabled={disabled}
              onClick={onDelete}
              aria-label="حذف"
              className="keycap flex h-14 min-w-12 flex-[1.4] items-center justify-center rounded-md bg-key text-key-fg transition-transform duration-150 active:scale-[0.96] disabled:opacity-60"
            >
              <Delete className="size-6" strokeWidth={2} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
