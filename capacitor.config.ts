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
