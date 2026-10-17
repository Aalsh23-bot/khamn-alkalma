/** Minimal PWA plugin stub — no-op when full PWA assets are not required. */
export function grokPwaPlugin() {
  return {
    name: "grok-pwa-plugin",
    apply: "serve",
  };
}
