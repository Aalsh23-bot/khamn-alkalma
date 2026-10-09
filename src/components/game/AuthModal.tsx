import { useEffect, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { AuthUser } from "@/lib/supabase/auth";
import { isIosApp } from "@/lib/native";
import { cn } from "@/lib/utils";

type SignUpResult = { user: AuthUser | null; needsEmailConfirm: boolean } | null;
type DeleteStep = "idle" | "confirm" | "working" | "done";

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
  signInWithApple,
  signOut,
  deleteAccount,
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
  signInWithApple?: () => Promise<AuthUser | null>;
  signOut: () => Promise<unknown>;
  deleteAccount: () => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  /** Keep profile visible through delete even after session clears. */
  const [profileSnapshot, setProfileSnapshot] = useState<AuthUser | null>(null);
  const showApple = Boolean(signInWithApple) && isIosApp();
  const locked = busy || deleteStep === "working" || deleteStep === "done";
  const shownUser = user ?? (deleteStep !== "idle" ? profileSnapshot : null);

  useEffect(() => {
    if (!open) {
      setDeleteStep("idle");
      setInfo(null);
      setProfileSnapshot(null);
      return;
    }
    if (user) setProfileSnapshot(user);
  }, [open, user]);

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

  async function onApple() {
    if (!signInWithApple) return;
    setInfo(null);
    clearError();
    const next = await signInWithApple();
    if (next) onClose();
  }

  function preventDismiss(e: Event) {
    // Close only via X / explicit buttons — avoids ghost-taps when opening
    // from settings and layout shifts during the delete steps.
    e.preventDefault();
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v && !locked) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay fixed inset-0 z-50 bg-fg/35" />
        <Dialog.Content
          className="dialog-panel fixed top-1/2 left-1/2 z-50 max-h-[min(88dvh,720px)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-bg-elevated p-5 shadow-[var(--shadow-border)]"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={preventDismiss}
          onInteractOutside={preventDismiss}
          onEscapeKeyDown={(e) => {
            if (locked) e.preventDefault();
          }}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-xl font-semibold text-balance">
              {shownUser
                ? "الحساب"
                : mode === "signin"
                  ? "تسجيل الدخول"
                  : "إنشاء حساب"}
            </Dialog.Title>
            <Dialog.Close
              className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-fg/6 hover:text-fg disabled:opacity-40"
              aria-label="إغلاق"
              disabled={locked}
            >
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {!configured ? (
            <p className="text-sm leading-7 text-muted">
              الحسابات غير مفعّلة بعد. أضف مفاتيح Supabase في ملف البيئة.
            </p>
          ) : shownUser ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-bg px-4 py-3">
                <p className="text-sm text-muted">مسجّل الدخول كـ</p>
                <p className="mt-1 font-medium text-fg">
                  {shownUser.displayName ||
                    shownUser.email ||
                    shownUser.id.slice(0, 8)}
                </p>
                {shownUser.email && (
                  <p className="mt-0.5 text-sm text-muted" dir="ltr">
                    {shownUser.email}
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-absent">{error}</p>}
              {info && <p className="text-sm text-muted">{info}</p>}

              {deleteStep === "done" ? (
                <div className="space-y-3 rounded-xl border border-line bg-bg px-4 py-3">
                  <p className="text-sm leading-7 text-fg">تم حذف الحساب.</p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-accent-fg"
                  >
                    حسناً
                  </button>
                </div>
              ) : deleteStep === "confirm" || deleteStep === "working" ? (
                <div className="space-y-3 rounded-xl border border-absent/30 bg-bg px-4 py-3">
                  <p className="text-sm leading-7 text-fg">
                    سيتم حذف حسابك وبيانات لوحة الصدارة المرتبطة به نهائياً. لا
                    يمكن التراجع.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setDeleteStep("idle");
                        setInfo(null);
                        clearError();
                      }}
                      className="flex h-11 flex-1 items-center justify-center rounded-xl bg-key text-sm font-semibold text-fg disabled:opacity-50"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        void (async () => {
                          clearError();
                          setInfo(null);
                          setDeleteStep("working");
                          const ok = await deleteAccount();
                          if (!ok) {
                            setDeleteStep("confirm");
                            return;
                          }
                          setDeleteStep("done");
                          setInfo(null);
                        })();
                      }}
                      className="flex h-11 flex-1 items-center justify-center rounded-xl bg-absent text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {deleteStep === "working" ? "جاري الحذف..." : "تأكيد الحذف"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => void signOut()}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-key text-sm font-semibold text-fg transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
                  >
                    تسجيل الخروج
                  </button>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      clearError();
                      setInfo(null);
                      setDeleteStep("confirm");
                    }}
                    className="flex h-12 w-full items-center justify-center rounded-xl border border-absent/40 text-sm font-semibold text-absent transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
                  >
                    حذف الحساب
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {showApple && (
                <>
                  <button
                    type="button"
                    disabled={busy || !ready}
                    onClick={() => void onApple()}
                    className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#000] text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
                  >
                    <AppleMark className="size-5" />
                    المتابعة مع Apple
                  </button>
                  <div className="flex items-center gap-3 py-0.5">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-xs text-muted">أو بالبريد</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                </>
              )}

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
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M16.365 1.43c0 1.14-.415 2.2-1.207 3.01-.85.87-2.03 1.42-3.12 1.34-.13-1.12.4-2.3 1.2-3.12.86-.9 2.3-1.56 3.13-1.23zM20.48 17.39c-.58 1.3-.85 1.88-1.6 3.03-1.04 1.55-2.5 3.48-4.32 3.5-1.62.02-2.04-1.05-4.25-1.04-2.2.01-2.67 1.07-4.29 1.05-1.82-.02-3.21-1.76-4.25-3.3C.14 17.8-.86 13.1.93 9.95c1.13-2 2.92-3.17 4.6-3.17 1.73 0 2.82 1.1 4.25 1.1 1.39 0 2.24-1.11 4.26-1.11 1.5 0 3.09.82 4.21 2.24-3.7 2.03-3.1 7.32.23 8.38z" />
    </svg>
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
          // text-base (16px) prevents iOS Safari/WKWebView focus zoom
          "h-12 w-full rounded-xl border border-line bg-bg px-3 text-base text-fg outline-none",
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
