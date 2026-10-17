import { Capacitor } from "@capacitor/core";
import { getAnonymousDeviceId, trackEvent } from "@/lib/analytics";
import { getSupabase } from "@/lib/supabase/client";
import { saveHintBalance, loadHintBalance } from "@/lib/game/hint-economy";
import {
  HINT_PACKS,
  hintsForProduct,
  revenueCatApiKey,
  type HintPackId,
} from "./config";

let configured = false;
let initPromise: Promise<boolean> | null = null;

export type ShopPack = {
  productId: HintPackId;
  hints: number;
  title: string;
  blurb: string;
  badge: string | null;
  priceLabel: string;
};

export function isIapSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initPurchases(appUserId?: string | null): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (configured) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const platform = Capacitor.getPlatform();
    if (platform !== "ios" && platform !== "android") return false;
    const apiKey = revenueCatApiKey(platform);
    if (!apiKey) return false;
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const deviceId = getAnonymousDeviceId();
      await Purchases.configure({
        apiKey,
        appUserID: appUserId || `device_${deviceId}`,
      });
      configured = true;
      return true;
    } catch {
      return false;
    }
  })();

  const ok = await initPromise;
  if (!ok) initPromise = null;
  return ok;
}

export async function fetchShopPacks(): Promise<ShopPack[]> {
  const base = HINT_PACKS.map((p) => ({
    productId: p.productId,
    hints: p.hints,
    title: p.title,
    blurb: p.blurb,
    badge: p.badge,
    priceLabel: p.fallbackPrice,
  }));

  const ready = await initPurchases();
  if (!ready) return base;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current?.availablePackages?.length) return base;

    return base.map((pack) => {
      const pkg = current.availablePackages.find(
        (p) =>
          p.product.identifier === pack.productId ||
          p.identifier === pack.productId ||
          p.product.identifier.endsWith(`.${pack.productId}`),
      );
      if (!pkg) return pack;
      return {
        ...pack,
        priceLabel: pkg.product.priceString || pack.priceLabel,
      };
    });
  } catch {
    return base;
  }
}

export type PurchaseResult =
  | { ok: true; balance: number }
  | { ok: false; error: string; cancelled?: boolean };

/** Purchase a consumable hint pack; server credits only after RevenueCat verifies the tx. */
export async function purchaseHintPack(productId: HintPackId): Promise<PurchaseResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, error: "المشتريات متاحة داخل التطبيق فقط" };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "الخدمة غير متاحة" };
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "سجّل الدخول أولاً لشراء باقات التلميحات" };
  }

  const ready = await initPurchases(session.user.id);
  if (!ready) {
    return {
      ok: false,
      error: "المشتريات غير مفعّلة بعد — أضف مفتاح RevenueCat وأكمل Paid Apps Agreement",
    };
  }

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    // Bind the StoreKit purchase to the authenticated Supabase user.
    try {
      await Purchases.logIn({ appUserID: session.user.id });
    } catch {
      /* already configured with this id */
    }

    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p) =>
        p.product.identifier === productId ||
        p.identifier === productId ||
        p.product.identifier.endsWith(`.${productId}`),
    );
    if (!pkg) {
      return {
        ok: false,
        error: "الباقة غير متاحة في المتجر حالياً. تأكد من تفعيل المنتجات في App Store Connect وRevenueCat.",
      };
    }

    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const transactionId = result.transaction?.transactionIdentifier;
    if (!transactionId) {
      return { ok: false, error: "لم يُرجع المتجر معرّف معاملة صالحاً" };
    }

    const credited = await creditPurchaseOnServer({
      productId,
      transactionId,
      storeProductId: pkg.product.identifier,
      appUserId: session.user.id,
    });

    trackEvent("purchase", {
      product_id: productId,
      hints: hintsForProduct(productId),
      ok: credited.ok,
    });

    if (!credited.ok) {
      return { ok: false, error: credited.error };
    }
    saveHintBalance(credited.balance);
    return { ok: true, balance: credited.balance };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cancelled =
      /cancel|user cancelled|purchasecancelled/i.test(message) ||
      (err &&
        typeof err === "object" &&
        "code" in err &&
        String((err as { code?: string }).code).includes("PURCHASE_CANCELLED"));
    return {
      ok: false,
      cancelled: Boolean(cancelled),
      error: cancelled ? "تم إلغاء الشراء" : message || "تعذّر إتمام الشراء",
    };
  }
}

async function creditPurchaseOnServer(input: {
  productId: string;
  transactionId: string;
  storeProductId: string;
  appUserId: string;
}): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase غير مضبوط" };
  try {
    const { data, error } = await sb.functions.invoke("credit-hint-purchase", {
      body: {
        product_id: input.productId,
        store_product_id: input.storeProductId,
        transaction_id: input.transactionId,
        device_id: getAnonymousDeviceId(),
        app_user_id: input.appUserId,
      },
    });
    if (error) return { ok: false, error: error.message };
    const payload = data as { balance?: number; error?: string; ok?: boolean } | null;
    if (payload && payload.ok === false) {
      return { ok: false, error: payload.error || "رفض الخادم اعتماد الشراء" };
    }
    const balance = Number(payload?.balance);
    if (!Number.isFinite(balance)) {
      return { ok: false, error: payload?.error || "رد غير صالح من الخادم" };
    }
    return { ok: true, balance };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "فشل الاعتماد" };
  }
}

/** Pull authoritative balance from Supabase into local cache. */
export async function syncHintBalanceFromServer(): Promise<number | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.rpc("get_hint_balance", {
      p_device_id: getAnonymousDeviceId(),
    });
    if (error) return null;
    const n = typeof data === "number" ? data : Number(data);
    if (!Number.isFinite(n)) return null;
    saveHintBalance(n);
    return n;
  } catch {
    return null;
  }
}

/** Decrement one purchased hint on the server (best-effort) after local consume. */
export async function spendHintOnServer(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb.rpc("spend_hint_balance", {
      p_device_id: getAnonymousDeviceId(),
    });
    if (error) return;
    const n = typeof data === "number" ? data : Number(data);
    if (Number.isFinite(n)) saveHintBalance(n);
  } catch {
    /* keep local */
  }
}
