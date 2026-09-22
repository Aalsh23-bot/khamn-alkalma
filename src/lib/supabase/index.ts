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
  signInWithAppleNative,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  toAuthUser,
  updateDisplayName,
  type AuthUser,
} from "./auth";
export { useSupabaseAuth } from "./use-auth";
export {
  createServerChallenge,
  fetchDailyMeta,
  fetchFriendChallenge,
  fetchLeaderboard,
  submitDailyResult,
  type DailyMeta,
  type LeaderboardRow,
  type SubmitDailyResult,
} from "./api";
