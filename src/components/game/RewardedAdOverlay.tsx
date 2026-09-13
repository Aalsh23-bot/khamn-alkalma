import { useEffect, useState } from "react";
import { registerSimulatedAdHandler, type AdResult } from "@/lib/ads/ads";
import type { RewardedPlacement } from "@/lib/ads/config";

/**
 * In-app rewarded-ad stand-in for web and until AdMob is wired on device.
 * Native builds use real AdMob when the plugin + unit IDs are available.
 */
export function RewardedAdOverlay() {
  const [open, setOpen] = useState<{
    placement: RewardedPlacement;
    title: string;
    body: string;
    resolve: (result: AdResult) => void;
  } | null>(null);
  const [seconds, setSeconds] = useState(3);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    registerSimulatedAdHandler((opts) => {
      return new Promise<AdResult>((resolve) => {
        setSeconds(3);
        setBusy(false);
        setOpen({ ...opts, resolve });
      });
    });
    return () => registerSimulatedAdHandler(null);
  }, []);

  useEffect(() => {
    if (!open || busy) return;
    if (seconds <= 0) return;
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [open, seconds, busy]);

  if (!open) return null;

  const finish = (result: AdResult) => {
    const { resolve } = open;
    setOpen(null);
    setBusy(false);
    resolve(result);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-fg/55 p-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={open.title}
    >
      <div className="w-full max-w-sm rounded-2xl bg-bg-elevated p-5 text-center shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium tracking-wide text-muted">إعلان اختياري</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-fg">{open.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{open.body}</p>

        <div className="mx-auto mt-5 flex h-28 w-full items-center justify-center rounded-xl bg-key">
          {seconds > 0 ? (
            <p className="text-sm text-muted">الإعلان ينتهي خلال {seconds}</p>
          ) : (
            <p className="text-sm font-medium text-accent">جاهز للمكافأة</p>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={seconds > 0 || busy}
            onClick={() => {
              setBusy(true);
              finish("rewarded");
            }}
            className="flex h-12 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            استلم المكافأة
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => finish("dismissed")}
            className="flex h-11 items-center justify-center text-sm text-muted"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
