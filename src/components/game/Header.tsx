import type { ReactNode } from "react";
import {
  BarChart3,
  HelpCircle,
  House,
  Lightbulb,
  Play,
  Settings2,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/game/store";
import { loadHintBalance } from "@/lib/game/hint-economy";

function IconBtn({
  label,
  onClick,
  children,
  active,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex min-h-11 min-w-11 items-center justify-center rounded-xl text-fg transition-colors duration-150",
        "hover:bg-fg/6 active:scale-[0.96] disabled:opacity-35",
        active && "bg-accent/12 text-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Header({
  mode,
  stageLevel,
  onHome,
  onHelp,
  onStats,
  onSettings,
  onHintAd,
  onHintBalance,
  onShareChallenge,
  hintUsed,
  hintDisabled,
  hintAwaitingGuess,
  hintBalance = loadHintBalance(),
}: {
  mode: Mode;
  stageLevel: number;
  onHome: () => void;
  onHelp: () => void;
  onStats: () => void;
  onSettings: () => void;
  onHintAd: () => void;
  onHintBalance: () => void;
  onShareChallenge?: () => void;
  hintUsed: boolean;
  hintDisabled: boolean;
  hintAwaitingGuess?: boolean;
  hintBalance?: number;
}) {
  const balance = Math.max(0, Math.floor(hintBalance));
  const awaiting = Boolean(hintAwaitingGuess);
  const exhausted = hintUsed || awaiting;

  return (
    <header className="flex items-center justify-between gap-0.5 border-b border-line px-0.5 py-1 sm:gap-1 sm:px-1">
      <div className="flex shrink-0 items-center">
        <IconBtn label="الرئيسية" onClick={onHome}>
          <House className="size-5" strokeWidth={1.8} />
        </IconBtn>
        <IconBtn label="كيف تلعب" onClick={onHelp}>
          <HelpCircle className="size-5" strokeWidth={1.8} />
        </IconBtn>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center px-0.5">
        <h1 className="font-display max-w-full truncate text-[1.15rem] font-semibold leading-none tracking-tight text-fg sm:text-[1.35rem]">
          {mode === "daily"
            ? "كلمة اليوم"
            : mode === "challenge"
              ? "تحدّي الأصدقاء"
              : `المرحلة ${stageLevel}`}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {mode === "challenge" && onShareChallenge && (
          <IconBtn label="شارك التحدّي" onClick={onShareChallenge} active>
            <Share2 className="size-5" strokeWidth={1.8} />
          </IconBtn>
        )}

        {/* Dual hint buttons — same footprint as prior single control (SE-safe). */}
        <IconBtn
          label={
            awaiting
              ? "أدخل تخميناً ثم استخدم التلميح مرة أخرى"
              : "تلميح بإعلان"
          }
          onClick={onHintAd}
          active={exhausted}
          disabled={hintDisabled}
          className={cn(
            "px-1",
            !exhausted && "bg-[#6aaa64] text-white hover:bg-[#6aaa64]/90",
          )}
        >
          <span className="flex w-[3.35rem] flex-col items-center gap-0.5 sm:w-[3.6rem]">
            <Play className="size-3.5 fill-current" strokeWidth={1.6} />
            {!exhausted && (
              <span className="text-center text-[9px] font-bold leading-tight sm:text-[10px]">
                تلميح بإعلان
              </span>
            )}
          </span>
        </IconBtn>

        <IconBtn
          label={`تلميحاتك (${balance})`}
          onClick={onHintBalance}
          active={exhausted}
          disabled={hintDisabled && balance > 0}
          className={cn(
            "px-1",
            !exhausted && "bg-[#3a6ea5] text-white hover:bg-[#3a6ea5]/90",
          )}
        >
          <span className="flex w-[3.35rem] flex-col items-center gap-0.5 sm:w-[3.6rem]">
            <Lightbulb className="size-3.5" strokeWidth={1.8} />
            {!exhausted && (
              <span className="text-center text-[9px] font-bold leading-tight tabular-nums sm:text-[10px]">
                تلميحاتك ({balance})
              </span>
            )}
          </span>
        </IconBtn>

        <IconBtn label="الإحصائيات" onClick={onStats}>
          <BarChart3 className="size-5" strokeWidth={1.8} />
        </IconBtn>
        <IconBtn label="الإعدادات" onClick={onSettings}>
          <Settings2 className="size-5" strokeWidth={1.8} />
        </IconBtn>
      </div>
    </header>
  );
}
