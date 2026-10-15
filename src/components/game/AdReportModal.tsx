import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { submitAdReport } from "@/lib/analytics";

const REASONS = [
  { id: "inappropriate", label: "غير لائق" },
  { id: "annoying", label: "مزعج" },
  { id: "misleading", label: "مضلل" },
  { id: "other", label: "غيره" },
] as const;

export function AdReportModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [reason, setReason] = useState<(typeof REASONS)[number]["id"]>("inappropriate");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await submitAdReport({
      reason: REASONS.find((r) => r.id === reason)?.label ?? reason,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNote("");
    setReason("inappropriate");
    onSubmitted?.();
    onClose();
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
            إبلاغ عن إعلان
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
            ساعدنا نبقي الإعلانات مناسبة للعائلة. اذكر السبب، ويمكنك إضافة اسم المعلن إن ظهر.
          </Dialog.Description>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setReason(r.id)}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  reason === r.id ? "bg-accent text-accent-fg" : "bg-key text-fg",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm font-medium text-fg">
            ملاحظة (اختياري)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="مثال: اسم المعلن أو وصف مختصر"
              className="mt-1.5 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
          </label>

          {error && <p className="mt-2 text-sm text-absent">{error}</p>}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-key text-sm font-medium text-fg"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              {busy ? "جارٍ الإرسال…" : "إرسال البلاغ"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
