import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Clapperboard, RotateCcw, Share2, X } from "lucide-react";
import type { LetterStatus } from "@/lib/game/evaluate";
import {
  formatArabicDate,
  formatCountdown,
  msUntilTomorrow,
} from "@/lib/game/daily";
import { ACHIEVEMENTS, type AchievementsSave } from "@/lib/game/achievements";
import { challengeInviteText } from "@/lib/game/challenge";
import { shareOrCopy, shareText } from "@/lib/game/share";
import { solutionLabel, type Mode } from "@/lib/game/store";
import { STAGE_COUNT } from "@/lib/game/words";
import type { SettingsSave, StatsSave } from "@/lib/game/storage";
import { cn } from "@/lib/utils";
import { WinCalendar } from "./WinCalendar";

function Shell({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-fg/35" />
        <Dialog.Content
          className={cn(
            "dialog-panel fixed top-1/2 left-1/2 z-50 max-h-[min(88dvh,720px)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]",
            wide && "w-[min(92vw,460px)]",
          )}
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-semibold text-balance">
              {title}
            </Dialog.Title>
            <Dialog.Close
              className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MiniTile({ status, letter }: { status?: LetterStatus; letter: string }) {
  const cls =
    status === "correct"
      ? "bg-correct text-correct-fg"
      : status === "present"
        ? "bg-present text-present-fg"
        : status === "absent"
          ? "bg-absent text-absent-fg"
          : "border border-line bg-bg";
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-sm font-bold",
        cls,
      )}
    >
      {letter}
    </span>
  );
}

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Shell open={open} onClose={onClose} title="كيف تلعب">
      <div className="space-y-4 text-[15px] leading-7 text-fg">
        <p className="text-pretty">خمس خانات وست محاولات. بعد كل تخمين يتلوّن الحرف:</p>
        <div className="flex items-center gap-2">
          <MiniTile status="correct" letter="م" />
          <p>صحيح وفي موضعه</p>
        </div>
        <div className="flex items-center gap-2">
          <MiniTile status="present" letter="د" />
          <p>في الكلمة بموضع آخر</p>
        </div>
        <div className="flex items-center gap-2">
          <MiniTile status="absent" letter="ر" />
          <p>غير موجود</p>
        </div>
        <div className="rounded-xl bg-bg p-3 text-sm leading-7 text-muted">
          <p className="mb-2 font-medium text-fg">ه و ة حرفان مختلفان · ى و ي مختلفان</p>
          <div className="flex flex-wrap items-center gap-2">
            <MiniTile letter="ه" />
            <MiniTile letter="ة" />
            <MiniTile letter="ى" />
            <MiniTile letter="ي" />
            <MiniTile letter="ئ" />
            <MiniTile letter="ؤ" />
          </div>
          <p className="mt-2">ا / أ / إ / آ حرف واحد.</p>
          <p className="mt-1">ئ و ؤ حرفان مستقلان (مثل: حقائق، مؤتمر).</p>
          <p className="mt-2">زر المصباح اختياري: شاهد إعلاناً لكشف حرف صحيح.</p>
          <p className="mt-1">بعد الخسارة يمكنك مشاهدة إعلان لاستعادة المحاولة، أو إعادة المرحلة بكلمة جديدة.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg transition-transform duration-150 active:scale-[0.98]"
        >
          حسناً
        </button>
      </div>
    </Shell>
  );
}

export function StatsModal({
  open,
  onClose,
  stats,
  achievements,
}: {
  open: boolean;
  onClose: () => void;
  stats: StatsSave;
  achievements: AchievementsSave;
}) {
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  const maxBar = Math.max(1, ...stats.distribution);
  return (
    <Shell open={open} onClose={onClose} title="الإحصائيات" wide>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          [stats.played, "لُعبت"],
          [winPct, "فوز ٪"],
          [stats.currentStreak, "سلسلة"],
          [stats.maxStreak, "أفضل"],
        ].map(([n, l]) => (
          <div key={String(l)} className="rounded-xl bg-bg px-1 py-3">
            <div className="font-display text-2xl font-semibold tabular-nums">{n}</div>
            <div className="mt-1 text-[11px] text-muted">{l}</div>
          </div>
        ))}
      </div>
      <p className="mt-5 mb-2 text-sm font-medium">توزيع المحاولات</p>
      <div className="space-y-1.5">
        {stats.distribution.map((n, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-4 tabular-nums text-muted">{i + 1}</span>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-bg">
              <div
                className={cn(
                  "flex h-full min-w-6 items-center justify-end rounded-md px-2 text-xs tabular-nums text-accent-fg",
                  n > 0 ? "bg-correct" : "bg-absent/50",
                )}
                style={{ width: `${Math.max(8, (n / maxBar) * 100)}%` }}
              >
                {n}
              </div>
            </div>
          </div>
        ))}
      </div>

      <WinCalendar dailyWins={stats.dailyWins ?? {}} currentStreak={stats.currentStreak} />

      <p className="mt-5 mb-2 text-sm font-medium">الشارات</p>
      <div className="grid grid-cols-2 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = Boolean(achievements.unlocked[a.id]);
          return (
            <div
              key={a.id}
              className={cn(
                "rounded-xl px-3 py-3 text-right",
                unlocked ? "bg-accent/10" : "bg-bg opacity-55",
              )}
            >
              <p className={cn("text-sm font-semibold", unlocked ? "text-accent" : "text-fg")}>
                {unlocked ? "★ " : "☆ "}
                {a.title}
              </p>
              <p className="mt-1 text-[11px] leading-4 text-muted">{a.hint}</p>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function SettingsModal({
  open,
  onClose,
  settings,
  onHardMode,
  onSound,
  onInstall,
  onPrivacy,
  isNative,
}: {
  open: boolean;
  onClose: () => void;
  settings: SettingsSave;
  onHardMode: (v: boolean) => void;
  onSound: (v: boolean) => void;
  onInstall: () => void;
  onPrivacy: () => void;
  isNative: boolean;
}) {
  return (
    <Shell open={open} onClose={onClose} title="الإعدادات">
      <div className="divide-y divide-line">
        <Toggle
          label="الوضع الصعب"
          hint="يجب استخدام كل تلميح ظهر في التخمين التالي"
          checked={settings.hardMode}
          onChange={onHardMode}
        />
        <Toggle
          label="الصوت"
          hint="نقرات خفيفة عند الكتابة والكشف"
          checked={settings.sound}
          onChange={onSound}
        />
      </div>
      {!isNative && (
        <button
          type="button"
          onClick={onInstall}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg transition-transform duration-150 active:scale-[0.98]"
        >
          تثبيت على الجوال
        </button>
      )}
      <button
        type="button"
        onClick={onPrivacy}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-key text-sm font-medium text-fg transition-transform duration-150 active:scale-[0.98]"
      >
        سياسة الخصوصية
      </button>
      {isNative && (
        <p className="mt-4 text-center text-xs text-muted">خمن الكلمة ١.٠ · على جهازك فقط</p>
      )}
    </Shell>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-0.5 block text-sm text-muted">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-accent" : "bg-key",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-bg-elevated shadow-sm transition-transform duration-150",
            checked ? "right-0.5" : "right-[22px]",
          )}
        />
      </button>
    </div>
  );
}

export function ResultModal({
  open,
  onClose,
  mode,
  status,
  answer,
  guesses,
  evaluations,
  puzzleNum,
  dateKey,
  stageLevel,
  hardMode,
  challengeCode,
  onAgain,
  onMap,
  onHome,
  onStats,
  onWatchAdRevive,
  onRetryNewWord,
  onNewChallenge,
  adBusy,
}: {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  status: "playing" | "won" | "lost";
  answer: string;
  guesses: string[];
  evaluations: LetterStatus[][];
  puzzleNum: number;
  dateKey: string;
  stageLevel: number;
  hardMode: boolean;
  challengeCode?: string | null;
  onAgain: () => void;
  onMap: () => void;
  onHome: () => void;
  onStats: () => void;
  onWatchAdRevive?: () => void;
  onRetryNewWord?: () => void;
  onNewChallenge?: () => void;
  adBusy?: boolean;
}) {
  const won = status === "won";
  const lost = status === "lost";
  const [copied, setCopied] = useState(false);
  const [remain, setRemain] = useState(msUntilTomorrow());

  useEffect(() => {
    if (!open || mode !== "daily") return;
    const id = window.setInterval(() => setRemain(msUntilTomorrow()), 1000);
    return () => window.clearInterval(id);
  }, [open, mode]);

  async function onShare() {
    const text = shareText({
      puzzleNum: mode === "stages" ? stageLevel : puzzleNum,
      dateKey,
      guesses: guesses.length,
      max: 6,
      evaluations,
      won,
      hardMode,
      mode,
      challengeCode: challengeCode ?? undefined,
    });
    try {
      await shareOrCopy(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* cancelled */
    }
  }

  async function onShareChallengeLink() {
    if (!challengeCode) return;
    try {
      await shareOrCopy(challengeInviteText(challengeCode));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* cancelled */
    }
  }

  const againLabel =
    mode === "stages"
      ? won
        ? stageLevel >= STAGE_COUNT
          ? "الخريطة"
          : "المرحلة التالية"
        : "حاول مجدداً"
      : mode === "challenge"
        ? "تحدّي جديد"
        : "الرئيسية";

  return (
    <Shell open={open} onClose={onClose} title={won ? "أحسنت" : "انتهت المحاولات"}>
      {won ? (
        <>
          <p className="text-center text-sm text-muted">الكلمة كانت</p>
          <p className="mt-1 text-center font-display text-3xl font-semibold text-fg">
            {solutionLabel(answer)}
          </p>
        </>
      ) : (
        <p className="text-center text-sm leading-6 text-muted">
          خلصت المحاولات. تقدر تشوف إعلاناً وتعيد آخر محاولة،
          {mode === "stages"
            ? " أو تعيد المرحلة بكلمة جديدة."
            : mode === "challenge"
              ? " أو تنشئ تحدّياً جديداً."
              : " أو ترجع للرئيسية."}
        </p>
      )}
      <div className="mx-auto mt-4 flex flex-col items-center gap-1" dir="rtl">
        {evaluations.map((row, i) => (
          <div key={i} className="flex gap-1">
            {row.map((st, j) => (
              <span
                key={j}
                className={cn(
                  "size-4 rounded-[3px]",
                  st === "correct" && "bg-correct",
                  st === "present" && "bg-present",
                  st === "absent" && "bg-absent",
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {mode === "daily" && won && (
        <div className="mt-5 rounded-xl bg-bg px-4 py-3 text-center">
          <p className="text-xs text-muted">{formatArabicDate(dateKey)}</p>
          <p className="mt-1 text-sm">الكلمة التالية خلال</p>
          <p className="font-display text-2xl font-semibold tabular-nums">
            {formatCountdown(remain)}
          </p>
        </div>
      )}

      {lost ? (
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={adBusy}
            onClick={onWatchAdRevive}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-fg disabled:opacity-50"
          >
            <Clapperboard className="size-4" />
            شاهد إعلاناً واستعد المحاولة
          </button>
          {mode === "stages" && (
            <button
              type="button"
              disabled={adBusy}
              onClick={onRetryNewWord}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-key text-sm font-medium text-fg disabled:opacity-50"
            >
              <RotateCcw className="size-4" />
              أعد المرحلة بكلمة جديدة
            </button>
          )}
          {mode === "challenge" && challengeCode && (
            <button
              type="button"
              disabled={adBusy}
              onClick={() => void onShareChallengeLink()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-key text-sm font-medium text-fg disabled:opacity-50"
            >
              <Share2 className="size-4" />
              شارك رابط التحدّي
            </button>
          )}
          <button
            type="button"
            disabled={adBusy}
            onClick={onShare}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 text-sm text-muted"
          >
            <Share2 className="size-4" />
            {copied ? "تم النسخ" : "مشاركة النتيجة"}
          </button>
          <button
            type="button"
            disabled={adBusy}
            onClick={
              mode === "stages" ? onMap : mode === "challenge" ? onNewChallenge : onHome
            }
            className="flex h-10 w-full items-center justify-center text-sm text-muted"
          >
            {mode === "stages" ? "الخريطة" : mode === "challenge" ? "تحدّي جديد" : "الرئيسية"}
          </button>
        </div>
      ) : (
        <>
          {mode === "challenge" && challengeCode && (
            <button
              type="button"
              onClick={() => void onShareChallengeLink()}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-fg"
            >
              <Share2 className="size-4" />
              {copied ? "تم النسخ" : "شارك التحدّي مع صديق"}
            </button>
          )}
          <div className={mode === "challenge" ? "mt-2 flex gap-2" : "mt-5 flex gap-2"}>
            <button
              type="button"
              onClick={onShare}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-key text-sm font-medium text-fg"
            >
              <Share2 className="size-4" />
              {copied ? "تم النسخ" : "مشاركة"}
            </button>
            <button
              type="button"
              onClick={
                mode === "challenge" ? onNewChallenge : onAgain
              }
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-fg text-sm font-semibold text-bg"
            >
              {againLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={mode === "stages" ? onMap : onStats}
            className="mt-2 flex h-11 w-full items-center justify-center text-sm text-muted"
          >
            {mode === "stages" ? "الخريطة" : "الإحصائيات"}
          </button>
          {(mode === "daily" || mode === "challenge") && (
            <button
              type="button"
              onClick={onHome}
              className="mt-1 flex h-10 w-full items-center justify-center text-sm text-muted"
            >
              الرئيسية
            </button>
          )}
        </>
      )}
    </Shell>
  );
}

export function BadgeModal({
  open,
  title,
  hint,
  onClose,
}: {
  open: boolean;
  title: string;
  hint: string;
  onClose: () => void;
}) {
  return (
    <Shell open={open} onClose={onClose} title="شارة جديدة">
      <div className="py-4 text-center">
        <p className="font-display text-3xl font-semibold text-accent">★</p>
        <p className="mt-3 font-display text-2xl font-semibold">{title}</p>
        <p className="mt-2 text-sm text-muted">{hint}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg"
        >
          رائع
        </button>
      </div>
    </Shell>
  );
}

export function InstallModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const isIOS =
    typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <Shell open={open} onClose={onClose} title="ثبّت خمن الكلمة على جوالك">
      <div className="space-y-3 text-[15px] leading-7">
        <p className="text-muted">
          أضف اللعبة إلى الشاشة الرئيسية ليبدو كتطبيق أصلي على آيفون وأندرويد.
        </p>
        {isIOS ? (
          <ol className="list-decimal space-y-2 pr-5">
            <li>اضغط زر المشاركة في سفاري.</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية».</li>
            <li>أكّد الاسم ثم أضف.</li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-2 pr-5">
            <li>افتح قائمة المتصفح (النقاط الثلاث).</li>
            <li>اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».</li>
            <li>أكّد، وستظهر الأيقونة مع تطبيقاتك.</li>
          </ol>
        )}
      </div>
    </Shell>
  );
}

export function PrivacyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Shell open={open} onClose={onClose} title="سياسة الخصوصية">
      <div className="space-y-4 text-[15px] leading-7 text-fg">
        <p className="text-sm text-muted">آخر تحديث: ٢٩ أغسطس ٢٠٢٦</p>
        <p>
          خمن الكلمة تُلعب على جهازك. لا نطلب حساباً، ولا نجمع بريداً، ولا نستخدم
          تتبعاً أو إعلانات.
        </p>
        <p>الإحصائيات والسلسلة والإعدادات تُحفظ محلياً على الجهاز.</p>
        <p>زر المشاركة يفتح ورقة النظام لنسخ النتيجة. لا نرسلها نيابة عنك.</p>
      </div>
    </Shell>
  );
}
