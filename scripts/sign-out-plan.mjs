/**
 * Shared sign-out sequencing (unit-testable outside React).
 */

/**
 * @param {{
 *   livePreview: boolean,
 *   hasBearer: boolean,
 *   requestSignOut: () => Promise<unknown>,
 *   clearToken: () => void,
 *   redirect?: () => void,
 * }} opts
 */
export async function runSignOut(opts) {
  const { livePreview, hasBearer, requestSignOut, clearToken, redirect } = opts;
  try {
    await requestSignOut();
  } catch (err) {
    if (!livePreview && !hasBearer) throw err;
  }
  clearToken();
  redirect?.();
}

/**
 * Best-effort clear before starting a new OAuth/email sign-in.
 * @param {{
 *   livePreview: boolean,
 *   hasBearer: boolean,
 *   requestSignOut: () => Promise<unknown>,
 *   clearToken: () => void,
 * }} opts
 */
export async function runPreSignInSignOut(opts) {
  try {
    await opts.requestSignOut();
  } catch {
    /* ignore — preview/bearer paths are best-effort */
  }
  opts.clearToken();
}
