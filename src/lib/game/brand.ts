export const APP_NAME = "خمن الكلمة";
export const APP_NAME_SHORT = "خمّن";

/** Site for privacy / app-ads.txt / invite landing (GitHub Pages). */
export const WEB_APP_URL = "https://aalsh23-bot.github.io/khamn-alkalma/";

/** Public App Store page (install). Cannot carry a challenge code into the app. */
export const APP_STORE_URL = "https://apps.apple.com/app/id6817761811";

/** Custom URL scheme registered on iOS — opens the installed app into a challenge. */
export const APP_URL_SCHEME = "khamsa";

export function challengeDeepLink(code: string): string {
  const c = code.trim().toUpperCase();
  return `${APP_URL_SCHEME}://challenge?c=${encodeURIComponent(c)}`;
}
