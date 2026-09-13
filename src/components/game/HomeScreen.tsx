import type { ReactNode } from "react";
import { CalendarDays, HelpCircle, Layers, Settings2 } from "lucide-react";
import { APP_NAME } from "@/lib/game/brand";
import { formatArabicDate, localDateKey } from "@/lib/game/daily";
import { STAGE_COUNT } from "@/lib/game/words";
import { loadRound, completedCount, type StagesSave, type StatsSave } from "@/lib/game/storage";

export function HomeScreen({
  stats,
  stages,
  onDaily,
  onStages,
  onHelp,
  onSettings,
}: {
  stats: StatsSave;
  stages: StagesSave;
  onDaily: () => void;
  onStages: () => void;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const today = localDateKey();
  const daily = loadRound("daily");
  const dailyToday = daily && daily.dateKey === today;
  const dailyDone = dailyToday && daily.status !== "playing";
  const dailyMid = dailyToday && daily.status === "playing" && daily.guesses.length > 0;
  const done = completedCount(stages);
  const current = Math.min(stages.unlocked, STAGE_COUNT);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col bg-bg px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label="كيف تلعب"
          onClick={onHelp}
          className="flex size-11 items-center justify-center rounded-xl text-fg hover:bg-fg/6"
        >
          <HelpCircle className="size-5" strokeWidth={1.8} />
        </button>
        <span className="text-xs text-muted">{formatArabicDate(today)}</span>
        <button
          type="button"
          aria-label="الإعدادات"
          onClick={onSettings}
          className="flex size-11 items-center justify-center rounded-xl text-fg hover:bg-fg/6"
        >
          <Settings2 className="size-5" strokeWidth={1.8} />
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center gap-1.5" dir="rtl" aria-hidden>
            {["خ", "م", "ن", "", ""].map((ch, i) => (
              <span
                key={i}
                className={
                  ch
                    ? "flex size-10 items-center justify-center rounded-md bg-correct text-lg font-bold text-correct-fg"
                    : "flex size-10 items-center justify-center rounded-md border-2 border-tile-border bg-tile-empty"
                }
              >
                {ch}
              </span>
            ))}
          </div>
          <h1 className="font-display text-[2.15rem] leading-none font-semibold tracking-tight text-fg">
            {APP_NAME}
          </h1>
          <p className="mt-3 text-sm text-muted">خمس أحرف · ست محاولات · فصحى</p>
        </div>

        <p className="mb-3 w-full text-sm font-medium text-fg">اختر طريقة اللعب</p>
        <div className="flex w-full flex-col gap-3">
          <ModeCard
            icon={<CalendarDays className="size-6" strokeWidth={1.8} />}
            title="كلمة اليوم"
            hint={
              dailyDone
                ? "أُنجزت اليوم — عد غداً لكلمة جديدة"
                : dailyMid
                  ? "متابعة لغز اليوم"
                  : "لغز واحد يتجدد منتصف الليل"
            }
            meta={
              stats.currentStreak > 0
                ? `السلسلة ${stats.currentStreak}`
                : "ابدأ السلسلة"
            }
            onClick={onDaily}
            accent
          />
          <ModeCard
            icon={<Layers className="size-6" strokeWidth={1.8} />}
            title="المراحل"
            hint={`المرحلة ${current} من ${STAGE_COUNT}`}
            meta={done > 0 ? `أُنجز ${done}` : "مائة مرحلة"}
            progress={done / STAGE_COUNT}
            onClick={onStages}
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  hint,
  meta,
  onClick,
  accent,
  progress,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  meta: string;
  onClick: () => void;
  accent?: boolean;
  progress?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl bg-bg-elevated px-4 py-5 text-right shadow-[var(--shadow-border)] transition-transform duration-150 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span
          className={
            accent
              ? "flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg"
              : "flex size-12 shrink-0 items-center justify-center rounded-xl bg-key text-fg"
          }
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-semibold">{title}</span>
          <span className="mt-0.5 block text-sm text-muted">{hint}</span>
        </span>
        <span className="shrink-0 text-xs font-medium text-accent">{meta}</span>
      </div>
      {progress != null && (
        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-key">
          <span
            className="block h-full rounded-full bg-correct"
            style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
          />
        </span>
      )}
    </button>
  );
}
