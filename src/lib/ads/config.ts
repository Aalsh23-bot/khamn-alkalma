/**
 * AdMob unit IDs.
 * iOS production IDs are live. Android still uses Google test IDs until an
 * Android AdMob app is created.
 */
export const ADMOB = {
  /** Production iOS IDs are wired; keep true for store builds. */
  useProductionIds: true,

  android: {
    appId: "ca-app-pub-3940256099942544~3347511713",
    rewardedHint: "ca-app-pub-3940256099942544/5224354917",
    rewardedRevive: "ca-app-pub-3940256099942544/5224354917",
  },
  ios: {
    appId: "ca-app-pub-9139788549801123~3810398783",
    rewardedHint: "ca-app-pub-9139788549801123/1922602042",
    rewardedRevive: "ca-app-pub-9139788549801123/8854841902",
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
