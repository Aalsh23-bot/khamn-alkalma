import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  fetchShopPacks,
  isIapSupported,
  purchaseHintPack,
  restorePurchases,
  type ShopPack,
} from "@/lib/iap/purchases";
import type { HintPackId } from "@/lib/iap/config";
import { formatCountdown, loadHintBalance } from "@/lib/game/hint-economy";
import { isHintPacksEnabled } from "@/lib/iap/feature-flags";
import {
  claimFreeDailyHint,
  fetchFreeHintStatus,
} from "@/lib/iap/free-hint";
import { isIosApp } from "@/lib/native";
import { isRegisteredUser } from "@/lib/supabase/auth";
import { useSupabaseAuth } from "@/lib/supabase/use-auth";

export function HintShopModal({
  open,
  onClose,
  onBalanceChange,
  onRequestAuth,
}: {
  open: boolean;
  onClose: () => void;
  onBalanceChange?: (balance: number) => void;
  onRequestAuth?: () => void;
}) {
  const auth = useSupabaseAuth();
  const registered = isRegisteredUser(auth.user);
  const [packs, setPacks] = useState<ShopPack[]>([]);
  const [packsEnabled, setPacksEnabled] = useState(false);
  const [balance, setBalance] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [freeAvailable, setFreeAvailable] = useState(true);
  const [freeNextAt, setFreeNextAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("00:00:00");

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setBalance(loadHintBalance());
    setLoading(true);
    void (async () => {
      const [enabled, status] = await Promise.all([
        isHintPacksEnabled(),
        fetchFreeHintStatus(),
      ]);
      setPacksEnabled(enabled);
      setFreeAvailable(status.available);
      setFreeNextAt(status.nextAt);
      if (status.balance != null && Number.isFinite(status.balance)) {
        setBalance(status.balance);
      }
      if (enabled) {
        try {
          setPacks(await fetchShopPacks());
        } catch {
          setPacks([]);
        }
      } else {
        setPacks([]);
      }
      setLoading(false);
    })();
  }, [open]);

  useEffect(() => {
    if (!open || freeAvailable || !freeNextAt) return;
    const tick = () => {
      const ms = new Date(freeNextAt).getTime() - Date.now();
      setCountdown(formatCountdown(ms));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open, freeAvailable, freeNextAt]);

  async function buy(productId: HintPackId) {
    if (busyId) return;
    setBusyId(productId);
    setMessage(null);
    const result = await purchaseHintPack(productId);
    setBusyId(null);
    if (!result.ok) {
      if (!result.cancelled) setMessage(result.error);
      return;
    }
    setBalance(result.balance);
    onBalanceChange?.(result.balance);
    setMessage(`تمت إضافة التلميحات · رصيدك الآن ${result.balance}`);
  }

  async function claimFree() {
    if (busyId) return;
    setBusyId("free");
    setMessage(null);
    const result = await claimFreeDailyHint();
    setBusyId(null);
    if (!result.ok) {
      setMessage(result.error);
      if (result.nextAt) {
        setFreeAvailable(false);
        setFreeNextAt(result.nextAt);
      }
      if (result.balance != null) {
        setBalance(result.balance);
        onBalanceChange?.(result.balance);
      }
      return;
    }
    setBalance(result.balance);
    onBalanceChange?.(result.balance);
    setFreeAvailable(false);
    setFreeNextAt(result.nextAt);
    setMessage(`🎉 تلميح مجاني أُضيف لرصيدك · ${result.balance}`);
  }

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
            "dialog-panel fixed top-1/2 left-1/2 z-50 max-h-[min(88dvh,720px)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]",
          )}
          dir="rtl"
        >
          <Dialog.Title className="font-display text-xl font-semibold text-fg">
            متجر التلميحات
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
            رصيدك الحالي:{" "}
            <span className="font-semibold text-fg tabular-nums">{balance}</span>
          </Dialog.Description>

          {/* Section: daily free */}
          <section className="mt-5">
            <h3 className="text-xs font-semibold tracking-wide text-muted">
              يومي
            </h3>
            <button
              type="button"
              disabled={Boolean(busyId) || !freeAvailable}
              onClick={() => void claimFree()}
              className={cn(
                "mt-2 flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-right transition-transform active:scale-[0.99] disabled:opacity-70",
                freeAvailable ? "bg-[#6aaa64] text-white" : "bg-key text-fg",
              )}
            >
              <span className="font-semibold">
                {freeAvailable
                  ? "خذ تلميحك المجاني"
                  : "التلميح المجاني الجاي"}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {busyId === "free"
                  ? "…"
                  : freeAvailable
                    ? "+1"
                    : freeNextAt
                      ? countdown
                      : "—"}
              </span>
            </button>
            <p className="mt-1.5 text-[11px] leading-5 text-muted">
              يتجدد كل يوم الساعة ١٢ ليلاً بتوقيت الكويت.
            </p>
          </section>

          {/* Section: IAP packs (hidden entirely when flag is off — no empty-state copy) */}
          {packsEnabled && (
            <section className="mt-6">
              <h3 className="text-xs font-semibold tracking-wide text-muted">
                باقات
              </h3>
              <div className="mt-2 space-y-2">
                {loading && (
                  <p className="text-sm text-muted">جارٍ تحميل الأسعار…</p>
                )}
                {packs.map((pack) => (
                  <button
                    key={pack.productId}
                    type="button"
                    disabled={Boolean(busyId) || !isIapSupported()}
                    onClick={() => void buy(pack.productId)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-key px-3 py-3 text-right transition-transform active:scale-[0.99] disabled:opacity-55"
                  >
                    <span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-fg">{pack.title}</span>
                        {pack.badge && (
                          <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                            {pack.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {pack.blurb}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-sm font-semibold text-accent-fg tabular-nums">
                      {busyId === pack.productId ? "…" : pack.priceLabel}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Reserved section slot for future "hints for coins" */}
          <section className="mt-6 hidden" aria-hidden data-shop-section="coins">
            <h3 className="text-xs font-semibold tracking-wide text-muted">
              تلميحات مقابل كوينز
            </h3>
          </section>

          {!registered && (
            <p className="mt-4 rounded-xl bg-key px-3 py-2.5 text-sm leading-6 text-fg">
              سجّل بأبل عشان تحفظ تلميحاتك
              {onRequestAuth && isIosApp() && (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="font-semibold text-accent underline-offset-2 hover:underline"
                    onClick={() => {
                      onClose();
                      onRequestAuth();
                    }}
                  >
                    تسجيل
                  </button>
                </>
              )}
            </p>
          )}

          {message && (
            <p className="mt-3 text-sm leading-6 text-fg">{message}</p>
          )}

          {packsEnabled && (
            <button
              type="button"
              disabled={restoring || Boolean(busyId)}
              onClick={() => {
                void (async () => {
                  setRestoring(true);
                  setMessage(null);
                  const result = await restorePurchases();
                  setRestoring(false);
                  if (!result.ok) {
                    setMessage(result.error);
                    return;
                  }
                  setBalance(result.balance);
                  onBalanceChange?.(result.balance);
                  setMessage(`تمت مزامنة الرصيد · ${result.balance}`);
                })();
              }}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-key text-sm font-medium text-fg disabled:opacity-55"
            >
              {restoring ? "جارٍ الاستعادة…" : "استعادة المشتريات"}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-key text-sm font-medium text-fg"
          >
            إغلاق
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
