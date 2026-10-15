import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  fetchShopPacks,
  isIapSupported,
  purchaseHintPack,
  type ShopPack,
} from "@/lib/iap/purchases";
import type { HintPackId } from "@/lib/iap/config";
import { loadHintBalance } from "@/lib/game/hint-economy";

export function HintShopModal({
  open,
  onClose,
  onBalanceChange,
}: {
  open: boolean;
  onClose: () => void;
  onBalanceChange?: (balance: number) => void;
}) {
  const [packs, setPacks] = useState<ShopPack[]>([]);
  const [balance, setBalance] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setBalance(loadHintBalance());
    setLoading(true);
    void fetchShopPacks()
      .then(setPacks)
      .finally(() => setLoading(false));
  }, [open]);

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
            باقات التلميحات
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
            اشترِ رصيداً واستخدمه بدل مشاهدة إعلان. رصيدك الحالي:{" "}
            <span className="font-semibold text-fg tabular-nums">{balance}</span>
          </Dialog.Description>

          {!isIapSupported() && (
            <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-sm text-muted">
              الشراء يعمل داخل تطبيق iOS بعد تفعيل المنتجات وRevenueCat.
            </p>
          )}

          <div className="mt-4 space-y-2">
            {loading && (
              <p className="text-sm text-muted">جارٍ تحميل الأسعار…</p>
            )}
            {packs.map((pack) => (
              <button
                key={pack.productId}
                type="button"
                disabled={Boolean(busyId) || !isIapSupported()}
                onClick={() => void buy(pack.productId)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl bg-key px-3 py-3 text-right transition-transform active:scale-[0.99] disabled:opacity-55",
                )}
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
                  <span className="mt-0.5 block text-xs text-muted">{pack.blurb}</span>
                </span>
                <span className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-sm font-semibold text-accent-fg tabular-nums">
                  {busyId === pack.productId ? "…" : pack.priceLabel}
                </span>
              </button>
            ))}
          </div>

          {message && (
            <p className="mt-3 text-sm leading-6 text-fg">{message}</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-key text-sm font-medium text-fg"
          >
            إغلاق
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
