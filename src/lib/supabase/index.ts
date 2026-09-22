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
export {
  createServerChallenge,
  fetchChallengeLobby,
  fetchDailyMeta,
  fetchFriendChallenge,
  fetchLeaderboard,
  joinFriendChallenge,
  submitChallengeResult,
  submitDailyResult,
  challengeOutcome,
  challengeSideForRole,
  type ChallengeLobby,
  type DailyMeta,
  type LeaderboardRow,
  type SubmitDailyResult,
} from "./api";
