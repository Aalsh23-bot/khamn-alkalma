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
  fetchChallengeLobby,
  fetchDailyMeta,
  fetchFriendChallenge,
  fetchLeaderboard,
  fetchLexiconSnapshot,
  fetchIsAppAdmin,
  adminListWords,
  adminUpsertWord,
  adminSetWordFlags,
  joinFriendChallenge,
  submitChallengeResult,
  submitDailyResult,
  challengeOutcome,
  challengeSideForRole,
  type ChallengeLobby,
  type DailyMeta,
  type LeaderboardRow,
  type LexiconSnapshotDto,
  type AdminWordRow,
  type SubmitDailyResult,
} from "./api";
