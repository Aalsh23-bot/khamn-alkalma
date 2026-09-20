export {
  getSupabase,
  requireSupabase,
  type AppSupabaseClient,
} from "./client";
export {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./env";
export type {
  Database,
  GameMode,
  WordTier,
} from "./types";
export {
  getSession,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  toAuthUser,
  updateDisplayName,
  type AuthUser,
} from "./auth";
export { useSupabaseAuth } from "./use-auth";
