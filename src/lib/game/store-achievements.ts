import {
  applyAchievements,
  evaluateNewAchievements,
} from "./achievement-logic";
import type { AchievementsSave } from "./achievements";
import { saveAchievements } from "./storage";

export function unlockAchievements(
  current: AchievementsSave,
  ctx: Parameters<typeof evaluateNewAchievements>[1],
): AchievementsSave {
  const newly = evaluateNewAchievements(current, ctx);
  if (newly.length === 0) return current;
  const next = applyAchievements(current, newly);
  saveAchievements(next);
  return next;
}
