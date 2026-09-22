import type { ReactNode } from "react";
import { BarChart3, HelpCircle, House, Lightbulb, Settings2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/game/store";

function IconBtn({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl text-fg transition-colors duration-150",
        "hover:bg-fg/6 active:scale-[0.96] disabled:opacity-35",
        active && "bg-accent/12 text-accent",
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
}) {
  const hintLabel = hintUsed
    ? "استُخدم التلميحان"
    : hintAwaitingGuess
      ? "أدخل تخميناً ثم استخدم التلميح مرة أخرى"
      : "كشف حرف مقابل إعلان";

  return (
    <header className="flex items-center justify-between gap-1 border-b border-line px-1 py-1">
      <div className="flex shrink-0 items-center">
        <IconBtn label="الرئيسية" onClick={onHome}>
          <House className="size-5" strokeWidth={1.8} />
        </IconBtn>
        <IconBtn label="كيف تلعب" onClick={onHelp}>
          <HelpCircle className="size-5" strokeWidth={1.8} />
        </IconBtn>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center">
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
          label={hintLabel}
          onClick={onHint}
          active={hintUsed || Boolean(hintAwaitingGuess)}
          disabled={hintDisabled}
        >
          <Lightbulb className="size-5" strokeWidth={1.8} />
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
