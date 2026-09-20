import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { AuthUser } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

type SignUpResult = { user: AuthUser | null; needsEmailConfirm: boolean } | null;

export function AuthModal({
  open,
  onClose,
  configured,
  ready,
  busy,
  error,
  user,
  clearError,
  signIn,
  signUp,
  signOut,
}: {
  open: boolean;
  onClose: () => void;
  configured: boolean;
  ready: boolean;
  busy: boolean;
  error: string | null;
  user: AuthUser | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<AuthUser | null>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<SignUpResult>;
  signOut: () => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInfo(null);
    if (mode === "signin") {
      const next = await signIn(email, password);
      if (next) onClose();
      return;
    }
    const result = await signUp(email, password, displayName);
    if (!result) return;
    if (result.needsEmailConfirm) {
      setInfo("تم إنشاء الحساب. أكّد بريدك من رسالة التفعيل ثم سجّل الدخول.");
      setMode("signin");
      return;
    }
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-fg/35" />
        <Dialog.Content
          className="dialog-panel fixed top-1/2 left-1/2 z-50 max-h-[min(88dvh,720px)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]"
          aria-describedby={undefined}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-semibold text-balance">
              {user ? "الحساب" : mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
            </Dialog.Title>
            <Dialog.Close
              className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {!configured ? (
            <p className="text-sm leading-7 text-muted">
              الحسابات غير مفعّلة بعد. أضف مفاتيح Supabase في ملف البيئة.
            </p>
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-bg px-4 py-3">
                <p className="text-sm text-muted">مسجّل الدخول كـ</p>
                <p className="mt-1 font-medium text-fg">
                  {user.displayName || user.email || user.id.slice(0, 8)}
                </p>
                {user.email && (
                  <p className="mt-0.5 text-sm text-muted" dir="ltr">
                    {user.email}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-absent">{error}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={() => void signOut()}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-key text-sm font-semibold text-fg transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                تسجيل الخروج
              </button>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={(e) => void onSubmit(e)}>
              {mode === "signup" && (
                <Field
                  label="الاسم الظاهر"
                  value={displayName}
                  onChange={setDisplayName}
                  autoComplete="nickname"
                  placeholder="اختياري"
                />
              )}
              <Field
                label="البريد"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
                dir="ltr"
                required
              />
              <Field
                label="كلمة المرور"
                value={password}
                onChange={setPassword}
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                dir="ltr"
                required
                minLength={6}
              />

              {error && <p className="text-sm text-absent">{error}</p>}
              {info && <p className="text-sm text-muted">{info}</p>}

              <button
                type="submit"
                disabled={busy || !ready}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? "جاري..." : mode === "signin" ? "دخول" : "إنشاء حساب"}
              </button>

              <button
                type="button"
                className="flex h-11 w-full items-center justify-center text-sm text-muted hover:text-fg"
                onClick={() => {
                  clearError();
                  setInfo(null);
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                }}
              >
                {mode === "signin"
                  ? "ما عندك حساب؟ أنشئ واحداً"
                  : "عندك حساب؟ سجّل الدخول"}
              </button>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  dir,
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-fg">{label}</span>
      <input
        className={cn(
          "h-12 w-full rounded-xl border border-line bg-bg px-3 text-sm text-fg outline-none",
          "placeholder:text-muted focus:border-accent",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        dir={dir}
        required={required}
        minLength={minLength}
      />
    </label>
  );
}
