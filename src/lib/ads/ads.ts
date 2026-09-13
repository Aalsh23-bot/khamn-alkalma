import { Capacitor } from "@capacitor/core";
import { ADMOB, rewardedUnitId, type RewardedPlacement } from "./config";

export type AdResult = "rewarded" | "dismissed" | "unavailable";

type SimulatedHandler = (opts: {
  placement: RewardedPlacement;
  title: string;
  body: string;
}) => Promise<AdResult>;

let simulatedHandler: SimulatedHandler | null = null;
let admobReady = false;

const COPY: Record<RewardedPlacement, { title: string; body: string }> = {
  hint: {
    title: "كشف حرف",
    body: "شاهد إعلاناً قصيراً لتكشف حرفاً صحيحاً من الكلمة.",
  },
  revive: {
    title: "فرصة إضافية",
    body: "شاهد إعلاناً لاستعادة محاولتك الأخيرة والمتابعة بنفس الكلمة.",
  },
};

/** Mounted by RewardedAdOverlay so web/dev can simulate rewarded ads. */
export function registerSimulatedAdHandler(handler: SimulatedHandler | null) {
  simulatedHandler = handler;
}

async function ensureAdMob(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (admobReady) return true;
  try {
    const { AdMob } = await import("@capacitor-community/admob");
    await AdMob.initialize({
      initializeForTesting: !ADMOB.useProductionIds,
    });
    admobReady = true;
    return true;
  } catch {
    return false;
  }
}

async function showNativeRewarded(placement: RewardedPlacement): Promise<AdResult> {
  const platform = Capacitor.getPlatform();
  if (platform !== "ios" && platform !== "android") return "unavailable";

  const ok = await ensureAdMob();
  if (!ok) return "unavailable";

  try {
    const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");
    const adId = rewardedUnitId(platform, placement);

    await AdMob.prepareRewardVideoAd({
      adId,
      isTesting: !ADMOB.useProductionIds,
    });

    return await new Promise<AdResult>((resolve) => {
      let settled = false;
      const handles: Array<{ remove: () => Promise<void> }> = [];

      const finish = (result: AdResult) => {
        if (settled) return;
        settled = true;
        for (const handle of handles) {
          void handle.remove();
        }
        resolve(result);
      };

      void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        finish("rewarded");
      }).then((h) => handles.push(h));

      void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        finish("dismissed");
      }).then((h) => handles.push(h));

      void AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        finish("unavailable");
      }).then((h) => handles.push(h));

      void AdMob.showRewardVideoAd().catch(() => finish("unavailable"));
    });
  } catch {
    return "unavailable";
  }
}

/**
 * Show a rewarded ad. Resolves "rewarded" only when the user earns the reward.
 * Falls back to an in-app simulation on web / when AdMob is not linked yet.
 */
export async function showRewardedAd(placement: RewardedPlacement): Promise<AdResult> {
  if (Capacitor.isNativePlatform()) {
    const native = await showNativeRewarded(placement);
    if (native !== "unavailable") return native;
  }

  if (simulatedHandler) {
    const copy = COPY[placement];
    return simulatedHandler({
      placement,
      title: copy.title,
      body: copy.body,
    });
  }

  return "unavailable";
}
