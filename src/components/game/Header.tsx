import type { ReactNode } from "react";
import { BarChart3, HelpCircle, House, Lightbulb, Play, Settings2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/game/store";
import type { HintOfferKind } from "@/lib/game/hint-economy";
import { hintOfferLabel, loadHintBalance } from "@/lib/game/hint-economy";

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
  hintOffer = "ad",
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
  hintOffer?: HintOfferKind;
}) {
  const balance = loadHintBalance();
  const kind: HintOfferKind = hintUsed
    ? "exhausted"
    : hintAwaitingGuess
      ? "exhausted"
      : hintOffer;

  const hintLabel = hintAwaitingGuess
    ? "أدخل تخميناً ثم استخدم التلميح مرة أخرى"
    : hintOfferLabel(kind, balance);

  // Plan §15: free=green, ad=orange + video, balance shows count.
  const hintTone =
    kind === "free"
      ? "bg-[#6aaa64] text-white"
      : kind === "ad"
        ? "bg-[#e67e22] text-white"
        : kind === "balance"
          ? "bg-accent/15 text-accent"
          : undefined;

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
          className={cn("px-1.5", hintTone)}
        >
          <span className="flex max-w-[5.5rem] flex-col items-center gap-0.5">
            {kind === "ad" ? (
              <span className="flex items-center gap-0.5">
                <Play className="size-3.5 fill-current" strokeWidth={1.6} />
                <Lightbulb className="size-4" strokeWidth={1.8} />
              </span>
            ) : (
              <Lightbulb className="size-5" strokeWidth={1.8} />
            )}
            {!hintUsed && !hintAwaitingGuess && (
              <span className="truncate text-[8px] font-bold leading-none">
                {kind === "free"
                  ? "تلميح مجاني"
                  : kind === "ad"
                    ? "تلميح مقابل إعلان"
                    : kind === "balance"
                      ? `تلميح (${balance})`
                      : ""}
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
