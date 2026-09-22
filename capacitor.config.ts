import type { CapacitorConfig } from "@capacitor/cli";

/**
 * AdMob is intentionally omitted from native sync for now.
 * Linking GoogleMobileAds without a fully configured Info.plist crashes iOS on launch.
 * Re-add "@capacitor-community/admob" here once production AdMob IDs are wired.
 */
const NATIVE_PLUGINS = [
  "@capacitor/app",
  "@capacitor/haptics",
  "@capacitor/keyboard",
  "@capacitor/share",
  "@capacitor/splash-screen",
  "@capacitor/status-bar",
] as const;

const config: CapacitorConfig = {
  appId: "app.khamsa.game",
  appName: "خمن الكلمة",
  webDir: "dist-native",
  backgroundColor: "#F3EEE4",
  includePlugins: [...NATIVE_PLUGINS],
  ios: {
    contentInset: "automatic",
    backgroundColor: "#F3EEE4",
    preferredContentMode: "mobile",
    // Use default Capacitor scheme — custom schemes can leave a blank WKWebView on simulator
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    backgroundColor: "#F3EEE4",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#F3EEE4",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#F3EEE4",
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: false,
    },
  },
};

export default config;
