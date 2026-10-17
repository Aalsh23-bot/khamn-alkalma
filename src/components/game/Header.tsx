import type { ReactNode } from "react";
import {
  BarChart3,
  HelpCircle,
  House,
  Lightbulb,
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
  onHint,
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
  onHint: () => void;
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
    <header className="flex items-center justify-between gap-0.5 border-b border-line px-1 py-1">
      <div className="flex shrink-0 items-center">
        <IconBtn label="الرئيسية" onClick={onHome}>
          <House className="size-5" strokeWidth={1.8} />
        </IconBtn>
        <IconBtn label="كيف تلعب" onClick={onHelp}>
          <HelpCircle className="size-5" strokeWidth={1.8} />
        </IconBtn>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center px-1">
        <h1 className="font-display text-[1.35rem] font-semibold leading-none tracking-tight text-fg">
          {mode === "daily"
            ? "كلمة اليوم"
            : mode === "challenge"
              ? "تحدّي الأصدقاء"
              : `المرحلة ${stageLevel}`}
        </h1>
      </div>

      <div className="flex shrink-0 items-center">
        {mode === "challenge" && onShareChallenge && (
          <IconBtn label="شارك التحدّي" onClick={onShareChallenge} active>
            <Share2 className="size-5" strokeWidth={1.8} />
          </IconBtn>
        )}

        <IconBtn
          label={
            awaiting
              ? "أدخل تخميناً ثم استخدم التلميح مرة أخرى"
              : "تلميح"
          }
          onClick={onHint}
          active={exhausted}
          disabled={hintDisabled}
          className="px-1"
        >
          <span className="relative flex flex-col items-center gap-0.5">
            <Lightbulb className="size-5" strokeWidth={1.8} />
            {!exhausted && (
              <span className="text-[9px] font-bold leading-none">تلميح</span>
            )}
            {balance > 0 && !exhausted && (
              <span
                className="absolute -top-1.5 -left-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-fg tabular-nums"
                aria-hidden
              >
                {balance > 99 ? "99+" : balance}
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
