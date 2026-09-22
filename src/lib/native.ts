import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { APP_NAME } from "@/lib/game/brand";

export const APP_VERSION = "1.0.0";
export const APP_ID = "app.khamsa.game";

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export function isIosApp(): boolean {
  if (!isNativeApp()) return false;
  return Capacitor.getPlatform() === "ios";
}

export async function bootstrapNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#F3EEE4" });
    }
  } catch {
    /* plugin unavailable in this environment */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
  } catch {
    /* ios may ignore */
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 280 });
  } catch {
    /* already hidden */
  }

  void App.addListener("backButton", ({ canGoBack }) => {
    void import("@/lib/game/store").then(({ useGame }) => {
      const modal = useGame.getState().modal;
      if (modal) {
        useGame.getState().setModal(null);
        return;
      }
      const screen = useGame.getState().screen;
      if (screen !== "home") {
        useGame.getState().goHome();
        return;
      }
      if (canGoBack) {
        window.history.back();
        return;
      }
      void App.exitApp();
    });
  });
}

export async function haptic(
  kind: "light" | "medium" | "heavy" | "success" | "warning" | "error",
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (kind === "success" || kind === "warning" || kind === "error") {
      const type =
        kind === "success"
          ? NotificationType.Success
          : kind === "warning"
            ? NotificationType.Warning
            : NotificationType.Error;
      await Haptics.notification({ type });
      return;
    }
    const style =
      kind === "heavy"
        ? ImpactStyle.Heavy
        : kind === "medium"
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
    await Haptics.impact({ style });
  } catch {
    /* haptics optional */
  }
}

export async function nativeShare(
  text: string,
  opts?: { url?: string; dialogTitle?: string },
): Promise<void> {
  await Share.share({
    title: APP_NAME,
    text,
    url: opts?.url,
    dialogTitle: opts?.dialogTitle ?? "شارك نتيجتك",
  });
}
