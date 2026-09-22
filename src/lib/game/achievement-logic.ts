import type { AchievementId, AchievementsSave } from "./achievements";
import type { ChallengeStatsSave, StagesSave, StatsSave } from "./storage";
import { localDateKey } from "./daily";

export interface AchievementContext {
  stats: StatsSave;
  stages: StagesSave;
  challengeStats?: ChallengeStatsSave;
  /** Just won any mode (solved the word) */
  won: boolean;
  guessCount: number;
  stageLevel: number;
  mode: "daily" | "stages" | "challenge";
  /** Friend-challenge match outcome once both finished */
  challengeOutcome?: "win" | "loss" | "draw" | "pending";
}

/** Returns newly unlocked achievement ids (not already in unlocked). */
export function evaluateNewAchievements(
  current: AchievementsSave,
  ctx: AchievementContext,
): AchievementId[] {
  const have = current.unlocked;
  const next: AchievementId[] = [];

  const unlock = (id: AchievementId) => {
    if (!have[id] && !next.includes(id)) next.push(id);
  };

  if (ctx.won || ctx.stats.wins > 0) unlock("first_win");
  if (ctx.stats.currentStreak >= 3 || ctx.stats.maxStreak >= 3) unlock("streak_3");
  if (ctx.stats.currentStreak >= 7 || ctx.stats.maxStreak >= 7) unlock("streak_7");

  const unlockedStage = Math.max(ctx.stages.unlocked, ctx.stageLevel);
  const completed = Object.keys(ctx.stages.completed)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const maxCompleted = completed.length ? Math.max(...completed) : 0;
  const stageReach = Math.max(unlockedStage, maxCompleted);
  if (stageReach >= 50) unlock("stage_50");
  if (stageReach >= 100) unlock("stage_100");

  if (ctx.won && ctx.guessCount === 1) unlock("first_try");

  const cs = ctx.challengeStats;
  if (cs && cs.played > 0) unlock("challenge_first");
  if (cs && cs.wins > 0) unlock("challenge_win");
  if (cs && cs.wins >= 3) unlock("challenge_wins_3");
  if (cs && cs.draws > 0) unlock("challenge_draw");
  if (cs && (cs.winStreak >= 2 || cs.maxWinStreak >= 2)) unlock("challenge_streak_2");

  if (
    ctx.mode === "challenge" &&
    ctx.challengeOutcome === "win" &&
    ctx.won &&
    ctx.guessCount <= 3
  ) {
    unlock("challenge_fast");
  }
  if (
    ctx.mode === "challenge" &&
    ctx.challengeOutcome === "win" &&
    ctx.won &&
    ctx.guessCount === 1
  ) {
    unlock("challenge_first_try");
  }

  return next;
}

export function applyAchievements(
  current: AchievementsSave,
  newly: AchievementId[],
): AchievementsSave {
  if (newly.length === 0) return current;
  const unlocked = { ...current.unlocked };
  const stamp = localDateKey();
  for (const id of newly) {
    if (!unlocked[id]) unlocked[id] = stamp;
  }
  const pending = [...current.pending];
  for (const id of newly) {
    if (!pending.includes(id)) pending.push(id);
  }
  return { ...current, unlocked, pending };
}
