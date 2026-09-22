import { useEffect, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  adminListWords,
  adminSetWordFlags,
  adminUpsertWord,
  type AdminWordRow,
} from "@/lib/supabase/api";
import { cn } from "@/lib/utils";

export function WordsAdminModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<AdminWordRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newWord, setNewWord] = useState("");
  const [asAnswer, setAsAnswer] = useState(false);

  async function reload(q = search) {
    setBusy(true);
    setError(null);
    try {
      const data = await adminListWords({
        search: q.trim() || undefined,
        limit: 80,
      });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحميل");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void reload("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onAdd() {
    const w = newWord.trim();
    if (w.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      await adminUpsertWord({
        word: w,
        isAnswer: asAnswer,
        isGuessable: true,
        active: true,
        tier: asAnswer ? "common" : "familiar",
      });
      setNewWord("");
      await reload(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحفظ");
      setBusy(false);
    }
  }

  async function patch(
    id: number,
    patch: {
      isAnswer?: boolean;
      isGuessable?: boolean;
      active?: boolean;
    },
  ) {
    setBusy(true);
    setError(null);
    try {
      await adminSetWordFlags({
        id,
        isAnswer: patch.isAnswer,
        isGuessable: patch.isGuessable,
        active: patch.active,
      });
      await reload(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل التحديث");
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-fg/35" />
        <Dialog.Content
          className="dialog-panel fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,760px)] w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-bg-elevated shadow-[var(--shadow-border)]"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="font-display text-xl font-semibold">
                لوحة الكلمات
              </Dialog.Title>
              <p className="mt-1 text-xs text-muted">
                أضف / أوقف / حدّد إجابة أو تخمين — يتحدث قاموس اللاعبين يومياً
              </p>
            </div>
            <Dialog.Close
              className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 border-b border-line px-5 py-3">
            <div className="flex gap-2">
              <input
                className="h-11 flex-1 rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
                placeholder="بحث…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void reload(search);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void reload(search)}
                className="h-11 rounded-xl bg-key px-4 text-sm font-medium disabled:opacity-50"
              >
                بحث
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="h-11 min-w-[8rem] flex-1 rounded-xl border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
                placeholder="كلمة جديدة (٥ أحرف)"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                dir="rtl"
              />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={asAnswer}
                  onChange={(e) => setAsAnswer(e.target.checked)}
                />
                إجابة
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onAdd()}
                className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-50"
              >
                إضافة
              </button>
            </div>
            {error && <p className="text-sm text-absent">{error}</p>}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {rows.length === 0 && !busy ? (
              <p className="px-2 py-6 text-center text-sm text-muted">لا نتائج</p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      "rounded-xl px-3 py-2.5",
                      row.active ? "bg-bg" : "bg-bg/50 opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold tracking-wide text-fg">{row.word}</p>
                        <p className="text-[11px] text-muted">
                          {row.tier}
                          {row.is_answer ? " · إجابة" : ""}
                          {row.is_guessable ? " · تخمين" : ""}
                          {!row.active ? " · موقوفة" : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        <TinyBtn
                          disabled={busy}
                          onClick={() =>
                            void patch(row.id, { isAnswer: !row.is_answer })
                          }
                        >
                          {row.is_answer ? "إجابة ✓" : "إجابة"}
                        </TinyBtn>
                        <TinyBtn
                          disabled={busy}
                          onClick={() =>
                            void patch(row.id, {
                              isGuessable: !row.is_guessable,
                            })
                          }
                        >
                          {row.is_guessable ? "تخمين ✓" : "تخمين"}
                        </TinyBtn>
                        <TinyBtn
                          disabled={busy}
                          onClick={() =>
                            void patch(row.id, { active: !row.active })
                          }
                        >
                          {row.active ? "إيقاف" : "تفعيل"}
                        </TinyBtn>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TinyBtn({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-key px-2 py-1 text-[11px] font-medium text-fg disabled:opacity-50"
    >
      {children}
    </button>
  );
}
