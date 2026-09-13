/**
 * AdMob unit IDs.
 * Replace the production IDs after creating your AdMob apps for iOS & Android.
 * Defaults are Google's official test rewarded units so Store review / QA stays safe.
 */
export const ADMOB = {
  /** Set true only after you paste real production unit IDs below. */
  useProductionIds: false,

  android: {
    appId: "ca-app-pub-3940256099942544~3347511713",
    rewardedHint: "ca-app-pub-3940256099942544/5224354917",
    rewardedRevive: "ca-app-pub-3940256099942544/5224354917",
  },
  ios: {
    appId: "ca-app-pub-3940256099942544~1458002511",
    rewardedHint: "ca-app-pub-3940256099942544/1712485313",
    rewardedRevive: "ca-app-pub-3940256099942544/1712485313",
  },
} as const;

export type RewardedPlacement = "hint" | "revive";

export function rewardedUnitId(
  platform: "ios" | "android" | "web",
  placement: RewardedPlacement,
): string {
  if (platform === "web") return "";
  const pack = platform === "ios" ? ADMOB.ios : ADMOB.android;
  return placement === "hint" ? pack.rewardedHint : pack.rewardedRevive;
}
