/** In-App Purchase product IDs (App Store Connect Consumables). */
export const HINT_PACKS = [
  {
    productId: "hints_5",
    hints: 5,
    title: "5 تلميحات",
    blurb: "باقة صغيرة للطوارئ",
    badge: null as string | null,
    fallbackPrice: "$0.99",
  },
  {
    productId: "hints_20",
    hints: 20,
    title: "20 تلميح",
    blurb: "الأنسب لمعظم اللاعبين",
    badge: "الأكثر طلباً",
    fallbackPrice: "$2.99",
  },
  {
    productId: "hints_60",
    hints: 60,
    title: "60 تلميح",
    blurb: "أفضل قيمة للمدمنين",
    badge: "أفضل قيمة",
    fallbackPrice: "$6.99",
  },
] as const;

export type HintPackId = (typeof HINT_PACKS)[number]["productId"];

export function hintsForProduct(productId: string): number {
  return HINT_PACKS.find((p) => p.productId === productId)?.hints ?? 0;
}

/** Public SDK keys (safe in the client). Prefer env; empty = IAP disabled. */
export function revenueCatApiKey(platform: "ios" | "android"): string {
  if (platform === "ios") {
    return (
      (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined)?.trim() ||
      ""
    );
  }
  return (
    (import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY as string | undefined)?.trim() ||
    ""
  );
}
