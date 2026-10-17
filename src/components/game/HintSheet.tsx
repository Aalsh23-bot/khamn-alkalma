import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lightbulb, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCountdown } from "@/lib/game/hint-economy";
import {
  claimFreeDailyHint,
  fetchFreeHintStatus,
  type FreeHintStatus,
} from "@/lib/iap/free-hint";

export function HintSheet({
  open,
  onClose,
  balance,
  adBusy,
  onUseBalance,
  onWatchAd,
  onOpenShop,
  onBalanceChange,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  adBusy: boolean;
  onUseBalance: () => void;
  onWatchAd: () => void;
  onOpenShop: () => void;
  onBalanceChange?: (balance: number) => void;
}) {
  const bal = Math.max(0, Math.floor(balance));
  const [freeStatus, setFreeStatus] = useState<FreeHintStatus | null>(null);
  const [freeError, setFreeError] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [countdown, setCountdown] = useState("00:00:00");
  const [clockOffsetMs, setClockOffsetMs] = useState(0);

  async function loadFree(retry = false) {
    void retry;
    setFreeLoading(true);
    setFreeError(false);
    try {
      const status = await fetchFreeHintStatus();
      if (status.loadError) {
        setFreeError(true);
        setFreeStatus(null);
      } else {
        setFreeStatus(status);
        if (status.serverNow) {
          const serverMs = new Date(status.serverNow).getTime();
          if (Number.isFinite(serverMs)) {
            setClockOffsetMs(serverMs - Date.now());
          }
        }
        if (status.balance != null && Number.isFinite(status.balance)) {
          onBalanceChange?.(status.balance);
        }
      }
    } catch {
      setFreeError(true);
      setFreeStatus(null);
    } finally {
      setFreeLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadFree();
  }, [open]);

  useEffect(() => {
    if (!open || !freeStatus || freeStatus.available || !freeStatus.nextAt) return;
    const tick = () => {
      const target = new Date(freeStatus.nextAt!).getTime();
      const nowApprox = Date.now() + clockOffsetMs;
      setCountdown(formatCountdown(target - nowApprox));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open, freeStatus, clockOffsetMs]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-fg/40" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[min(78dvh,560px)] overflow-y-auto rounded-t-2xl bg-bg-elevated px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--shadow-border)]",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
          )}
          dir="rtl"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/15" />
          <div className="mb-3 flex items-center justify-between gap-2">
            <Dialog.Title className="font-display text-lg font-semibold text-fg">
              تلميح
            </Dialog.Title>
            <Dialog.Close
              className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <button
            type="button"
            disabled={adBusy || claiming}
            onClick={() => {
              if (bal > 0) {
                onUseBalance();
                onClose();
                return;
              }
              onClose();
              onOpenShop();
            }}
            className="flex w-full items-start gap-3 rounded-xl bg-key px-3 py-3 text-right transition-transform active:scale-[0.99] disabled:opacity-55"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
              <Lightbulb className="size-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-fg tabular-nums">
                💡 تلميحاتك ({bal})
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted">
                يكشف حرف صحيح في مكانه
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={adBusy || claiming}
            onClick={() => {
              onWatchAd();
            }}
            className="mt-2 flex w-full items-start gap-3 rounded-xl bg-[#6aaa64] px-3 py-3 text-right text-white transition-transform active:scale-[0.99] disabled:opacity-55"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
              <Play className="size-5 fill-current" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">▶️ تلميح بإعلان</span>
              <span className="mt-0.5 block text-xs leading-5 text-white/85">
                شاهد إعلان واحصل على تلميح
              </span>
            </span>
          </button>

          <div className="mt-3 border-t border-line pt-3">
            {freeLoading && (
              <p className="text-center text-xs text-muted">جارٍ التحميل…</p>
            )}
            {freeError && !freeLoading && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-center text-xs text-muted">
                  تعذّر التحميل، حاول مرة ثانية
                </p>
                <button
                  type="button"
                  onClick={() => void loadFree(true)}
                  className="rounded-lg bg-key px-3 py-1.5 text-xs font-semibold text-fg"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}
            {!freeLoading && !freeError && freeStatus?.available && (
              <button
                type="button"
                disabled={claiming || adBusy}
                onClick={() => {
                  void (async () => {
                    setClaiming(true);
                    const result = await claimFreeDailyHint();
                    setClaiming(false);
                    if (!result.ok) {
                      setFreeStatus((s) =>
                        s
                          ? {
                              ...s,
                              available: false,
                              nextAt: result.nextAt ?? s.nextAt,
                            }
                          : s,
                      );
                      if (result.balance != null) onBalanceChange?.(result.balance);
                      void loadFree();
                      return;
                    }
                    onBalanceChange?.(result.balance);
                    setFreeStatus({
                      available: false,
                      nextAt: result.nextAt,
                      kuwaitDate: null,
                      balance: result.balance,
                      serverNow: null,
                      loadError: false,
                    });
                  })();
                }}
                className="w-full rounded-xl bg-key px-3 py-2.5 text-center text-sm font-semibold text-fg disabled:opacity-55"
              >
                {claiming ? "…" : "خذ تلميحك المجاني 🎁"}
              </button>
            )}
            {!freeLoading &&
              !freeError &&
              freeStatus &&
              !freeStatus.available &&
              freeStatus.nextAt && (
                <p className="text-center text-xs leading-5 text-muted tabular-nums">
                  التلميح المجاني الجاي بعد {countdown}
                </p>
              )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
