import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.khamsa.game",
  appName: "خمن الكلمة",
  webDir: "dist-native",
  backgroundColor: "#F3EEE4",
  ios: {
    contentInset: "automatic",
    backgroundColor: "#F3EEE4",
    preferredContentMode: "mobile",
    scheme: "khamsa",
    // false avoids blank WKWebView when local assets/plugins load on first run
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
    // AdMob app IDs: replace with your production IDs in src/lib/ads/config.ts
    // and mirror them in ios/Android native manifests when shipping.
  },
};

export default config;
