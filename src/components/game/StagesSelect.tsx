import { ChevronRight, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_COUNT } from "@/lib/game/words";
import type { StagesSave } from "@/lib/game/storage";

export function StagesSelect({
  stages,
  onBack,
  onPick,
}: {
  stages: StagesSave;
  onBack: () => void;
  onPick: (level: number) => void;
}) {
  const unlocked = stages.unlocked;
  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between border-b border-line px-2 py-2">
        <button
          type="button"
          aria-label="الرئيسية"
          onClick={onBack}
          className="flex size-11 items-center justify-center rounded-xl text-fg hover:bg-fg/6"
        >
          <House className="size-5" strokeWidth={1.8} />
        </button>
        <div className="text-center">
          <h1 className="font-display text-xl font-semibold">المراحل</h1>
          <p className="text-xs text-muted">
            {Object.keys(stages.completed).length > 0
              ? `أُنجز ${Object.keys(stages.completed).length}`
              : "ابدأ المرحلة الأولى"}
          </p>
        </div>
        <span className="flex size-11 items-center justify-center text-muted">
          <ChevronRight className="size-5 opacity-0" />
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-6">
          {Array.from({ length: STAGE_COUNT }, (_, i) => {
            const level = i + 1;
            const done = stages.completed[String(level)];
            const lock = level > unlocked;
            const current = level === unlocked && !done;
            return (
              <button
                key={level}
                type="button"
                disabled={lock}
                onClick={() => onPick(level)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition-transform duration-150 active:scale-[0.96] disabled:opacity-40",
                  done
                    ? "bg-correct text-correct-fg"
                    : current
                      ? "bg-accent text-accent-fg shadow-[var(--shadow-border)]"
                      : "bg-key text-fg",
                )}
              >
                <span className="tabular-nums">{level}</span>
                {done && (
                  <span className="mt-0.5 text-[10px] font-medium opacity-90">
                    {done.guesses}/6
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
