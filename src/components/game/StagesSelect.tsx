import { Check, House, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_COUNT } from "@/lib/game/words";
import type { StagesSave } from "@/lib/game/storage";

const PAST_VISIBLE = 2;
const AHEAD_LOCKED = 2;

export function StagesSelect({
  stages,
  onBack,
  onPick,
}: {
  stages: StagesSave;
  onBack: () => void;
  onPick: (level: number) => void;
}) {
  const focus = Math.min(Math.max(1, stages.unlocked), STAGE_COUNT);
  const focusDone = Boolean(stages.completed[String(focus)]);
  const pastLevels = Array.from(
    { length: Math.min(PAST_VISIBLE, focus - 1) },
    (_, i) => focus - Math.min(PAST_VISIBLE, focus - 1) + i,
  );
  const hasMoreAhead = focus < STAGE_COUNT;
  const lockedCount = hasMoreAhead
    ? Math.min(AHEAD_LOCKED, STAGE_COUNT - focus)
    : 0;
  const showFog = hasMoreAhead;
  const doneCount = Object.keys(stages.completed).length;

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
            {doneCount > 0 ? "استمر في المسار" : "ابدأ المرحلة الأولى"}
          </p>
        </div>
        <span className="size-11" aria-hidden />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
        <div className="mx-auto flex w-full max-w-[280px] flex-col items-center">
          {pastLevels.map((level) => {
            const done = stages.completed[String(level)];
            return (
              <div key={level} className="flex w-full flex-col items-center">
                <button
                  type="button"
                  onClick={() => onPick(level)}
                  aria-label={`المرحلة ${level}${done ? " — مكتملة" : ""}`}
                  className={cn(
                    "flex size-12 flex-col items-center justify-center rounded-full text-sm font-semibold transition-transform duration-150 active:scale-[0.96]",
                    done
                      ? "bg-correct text-correct-fg"
                      : "bg-key text-fg",
                  )}
                >
                  {done ? (
                    <Check className="size-5" strokeWidth={2.4} />
                  ) : (
                    <span className="tabular-nums">{level}</span>
                  )}
                </button>
                {done && (
                  <span className="mt-1 text-[10px] tabular-nums text-muted">
                    {level} · {done.guesses}/6
                  </span>
                )}
                <PathStem />
              </div>
            );
          })}

          <div className="w-full rounded-2xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]">
            <p className="text-center text-xs font-medium text-muted">
              {focusDone ? "مرحلة مكتملة" : "المرحلة الحالية"}
            </p>
            <p className="mt-1 text-center font-display text-4xl font-semibold tabular-nums text-fg">
              {focus}
            </p>
            <p className="mt-1 text-center text-sm text-muted">خمّن الكلمة</p>
            {focusDone && stages.completed[String(focus)] && (
              <p className="mt-1 text-center text-[11px] tabular-nums text-muted">
                أفضل محاولة: {stages.completed[String(focus)]!.guesses}/6
              </p>
            )}
            <button
              type="button"
              onClick={() => onPick(focus)}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg transition-transform duration-150 active:scale-[0.98]"
            >
              {focusDone ? "أعد اللعب" : "العب"}
            </button>
          </div>

          {lockedCount > 0 && (
            <>
              <PathStem mystery={false} />
              {Array.from({ length: lockedCount }, (_, i) => (
                <div key={`lock-${i}`} className="flex w-full flex-col items-center">
                  <div
                    className="flex size-12 items-center justify-center rounded-full bg-key/70 text-subtle"
                    aria-hidden
                  >
                    <Lock className="size-4" strokeWidth={1.8} />
                  </div>
                  {i < lockedCount - 1 && <PathStem mystery />}
                </div>
              ))}
            </>
          )}

          {showFog && (
            <div className="mt-3 flex flex-col items-center gap-1.5" aria-hidden>
              <span className="h-5 w-px bg-gradient-to-b from-line to-transparent" />
              <span className="text-lg leading-none tracking-[0.2em] text-subtle">
                ···
              </span>
              <p className="mt-1 text-center text-[11px] text-muted">
                المسار مستمر — اكتشفه باللعب
              </p>
            </div>
          )}

          {!hasMoreAhead && focusDone && (
            <p className="mt-5 text-center text-sm text-muted">
              وصلت لنهاية المسار الحالي
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PathStem({ mystery = false }: { mystery?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "my-1.5 h-7 w-px",
        mystery
          ? "bg-[repeating-linear-gradient(to_bottom,var(--color-line)_0_3px,transparent_3px_7px)]"
          : "bg-line",
      )}
    />
  );
}
