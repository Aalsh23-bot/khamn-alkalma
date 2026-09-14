import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { registerSimulatedAdHandler, type AdResult } from "@/lib/ads/ads";
import type { RewardedPlacement } from "@/lib/ads/config";

/**
 * In-app rewarded-ad stand-in for web and until AdMob is wired on device.
 * Native builds use real AdMob when the plugin + unit IDs are available.
 *
 * Portaled to document.body with a high z-index so it is never trapped under
 * Radix Dialog overlays (result / settings / etc.).
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
  const settledRef = useRef(false);

  useEffect(() => {
    registerSimulatedAdHandler((opts) => {
      return new Promise<AdResult>((resolve) => {
        settledRef.current = false;
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

  if (!open || typeof document === "undefined") return null;

  const finish = (result: AdResult) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const { resolve } = open;
    setOpen(null);
    setBusy(false);
    // Defer resolve so unmount paints before parent state updates.
    window.setTimeout(() => resolve(result), 0);
  };

  const canClaim = seconds <= 0 && !busy;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-fg/55 p-5 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={open.title}
      // Capture all pointer events so nothing underneath can steal taps.
      onPointerDown={(e) => e.stopPropagation()}
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
            disabled={!canClaim}
            onClick={() => {
              if (!canClaim) return;
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
    </div>,
    document.body,
  );
}
